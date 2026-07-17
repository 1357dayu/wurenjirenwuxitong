import { sampleTasks } from './sampleData';
import { nowStr, todayStr, TASK_TYPES } from './constants';

const KEY = 'drone_rescan_tasks_v1';

// 任务类型归一：不在 TASK_TYPES 内一律归为 '复扫'
function normalizeTaskType(taskType) {
  return TASK_TYPES.includes(taskType) ? taskType : '复扫';
}

// 扫描次数归一：非法值按 0
function normalizeScanCount(scanCount) {
  const n = parseInt(scanCount, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

// 数据迁移：旧数据缺 taskType 补 '复扫'，缺 scanCount 补 0，缺 driver 补 ''（仅补在返回对象上，不强制回写）
function migrateTask(t) {
  return {
    ...t,
    taskType: normalizeTaskType(t.taskType),
    driver: t.driver === undefined || t.driver === null ? '' : t.driver,
    scanCount: t.scanCount === undefined || t.scanCount === null || t.scanCount === ''
      ? 0
      : normalizeScanCount(t.scanCount)
  };
}

// 读取全部任务；首次使用写入示例数据
export function loadTasks() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(sampleTasks));
      return sampleTasks.map(migrateTask);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(migrateTask) : [];
  } catch (e) {
    console.error('读取任务失败', e);
    return [];
  }
}

// 写入 localStorage，带兜底：配额超限等异常时返回 false
export function saveTasks(tasks) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
    return true;
  } catch (e) {
    console.error('保存任务失败（可能是存储空间不足）', e);
    return false;
  }
}

// 生成任务 id：优先 crypto.randomUUID，不可用时回退原方案
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

// 批量导入任务：merge 按任务编号去重合并，replace 全量替换
// 返回 { added, skipped } 统计；合并进来的任务统一做 taskType/scanCount 归一
export function importTasks(newTasks, mode = 'merge') {
  if (!Array.isArray(newTasks)) return { added: 0, skipped: 0 };
  const normalized = newTasks.map(migrateTask);
  if (mode === 'replace') {
    saveTasks(normalized);
    return { added: normalized.length, skipped: 0 };
  }
  const tasks = loadTasks();
  const existingNos = new Set(tasks.map(t => t.taskNo));
  let added = 0;
  let skipped = 0;
  normalized.forEach(t => {
    if (t.taskNo && existingNos.has(t.taskNo)) {
      skipped += 1;
    } else {
      tasks.push(t);
      if (t.taskNo) existingNos.add(t.taskNo);
      added += 1;
    }
  });
  saveTasks(tasks);
  return { added, skipped };
}

// 生成任务编号：FS-年月日-三位序号（同日序号自增）
export function genTaskNo(tasks) {
  const today = todayStr().replace(/-/g, '');
  const prefix = `FS-${today}-`;
  const todays = tasks
    .filter(t => typeof t.taskNo === 'string' && t.taskNo.startsWith(prefix))
    .map(t => parseInt(t.taskNo.slice(prefix.length), 10))
    .filter(n => !Number.isNaN(n));
  const next = (todays.length ? Math.max(...todays) : 0) + 1;
  return prefix + String(next).padStart(3, '0');
}

export function getTask(id) {
  return loadTasks().find(t => t.id === id) || null;
}

export function createTask(data) {
  const tasks = loadTasks();
  const status = data.status || '待复扫';
  // 扫描次数：默认 0；若创建时已是“已完成/已闭环”且未提供 scanCount，则记 1
  let scanCount;
  if (data.scanCount === undefined || data.scanCount === null || data.scanCount === '') {
    scanCount = (status === '已完成' || status === '已闭环') ? 1 : 0;
  } else {
    scanCount = normalizeScanCount(data.scanCount);
  }
  const task = {
    id: uid(),
    taskNo: data.taskNo && data.taskNo.trim() ? data.taskNo.trim() : genTaskNo(tasks),
    taskType: normalizeTaskType(data.taskType),
    lineName: data.lineName || '',
    towerRange: data.towerRange || '',
    pilot: data.pilot || '',
    pilot2: data.pilot2 || '',
    driver: data.driver || '',
    planDate: data.planDate || '',
    actualDate: data.actualDate || '',
    status,
    rescanResult: data.rescanResult || '',
    conclusion: data.conclusion || '',
    scanCount,
    remark: data.remark || '',
    createdAt: nowStr(),
    updatedAt: nowStr()
  };
  tasks.unshift(task);
  saveTasks(tasks);
  return task;
}

export function updateTask(id, patch) {
  const tasks = loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch, updatedAt: nowStr() };
  saveTasks(tasks);
  return tasks[idx];
}

export function deleteTask(id) {
  const tasks = loadTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

export function resetSampleData() {
  saveTasks(sampleTasks);
}
