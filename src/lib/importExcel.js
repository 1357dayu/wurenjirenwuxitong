import { uid } from './storage';
import { nowStr } from './constants';

// Excel 表头中文名 → 任务字段 映射
// 日期列新旧双名兼容：新名 '开始时间' 与旧名 '计划扫描日期' 均映射到 planDate，
// 新名 '结束时间' 与旧名 '实际扫描日期' 均映射到 actualDate，
// 保证新版导出文件与旧版 13/15/16 列文件都能正常导入（英文字段名 planDate/actualDate 不变）。
// 更早的历史别名仍保留：'计划复扫日期'、'实际复扫日期' → 对应日期列，'复扫结果' 等同 '扫描结果'
const HEADER_MAP = {
  '任务编号': 'taskNo',
  '任务类型': 'taskType',
  '线路名称': 'lineName',
  '杆塔 / 区段': 'towerRange',
  '杆塔/区段': 'towerRange',
  '责任飞手': 'pilot',
  '协助飞手': 'pilot2',
  '司机': 'driver',
  '开始时间': 'planDate',
  '计划扫描日期': 'planDate',
  '计划复扫日期': 'planDate',
  '结束时间': 'actualDate',
  '实际扫描日期': 'actualDate',
  '实际复扫日期': 'actualDate',
  '当前状态': 'status',
  '扫描结果': 'rescanResult',
  '复扫结果': 'rescanResult',
  '闭环结论': 'conclusion',
  '扫描次数': 'scanCount',
  '备注': 'remark',
  '创建时间': 'createdAt',
  '更新时间': 'updatedAt'
};

const VALID_STATUSES = ['待复扫', '已派发', '已完成', '需再次扫描', '已闭环'];

// 任务类型归一：含 '通扫' → '通扫'，否则 → '复扫'
function normalizeTaskType(value) {
  return String(value || '').includes('通扫') ? '通扫' : '复扫';
}

// 扫描次数归一：parseInt 失败按 0
function normalizeScanCount(value) {
  const n = parseInt(value, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
}

// 从 Excel 文件导入任务（exceljs 动态加载，不进首屏）
// file 为用户选择的 .xlsx 文件，返回解析出的任务数组
export async function importTasksFromExcel(file) {
  const { default: ExcelJS } = await import('exceljs');

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const ws = workbook.worksheets[0];
  if (!ws) {
    throw new Error('Excel 文件中没有工作表，无法导入。');
  }

  // 解析表头（第一行），建立 列号 → 字段 映射
  const headerRow = ws.getRow(1);
  const colMap = {}; // { 列号: 字段名 }
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const name = String(cell.value ?? '').trim();
    if (HEADER_MAP[name]) {
      colMap[colNumber] = HEADER_MAP[name];
    }
  });

  if (Object.keys(colMap).length === 0) {
    throw new Error('未识别到有效表头，请使用系统导出的台账文件（首行需包含：任务编号、线路名称 等中文字段）。');
  }

  // 遍历数据行
  const tasks = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // 跳过表头

    const data = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = colMap[colNumber];
      if (!field) return;
      data[field] = cellToText(cell.value);
    });

    // 整行皆空则跳过
    const hasContent = Object.values(data).some(v => v !== '');
    if (!hasContent) return;

    const now = nowStr();
    tasks.push({
      id: uid(),
      taskNo: data.taskNo || '',
      taskType: normalizeTaskType(data.taskType),
      lineName: data.lineName || '',
      towerRange: data.towerRange || '',
      pilot: data.pilot || '',
      pilot2: data.pilot2 || '',
      // 旧文件没有司机列时默认 ''
      driver: data.driver || '',
      planDate: data.planDate || '',
      actualDate: data.actualDate || '',
      status: VALID_STATUSES.includes(data.status) ? data.status : '待复扫',
      rescanResult: data.rescanResult || '',
      conclusion: data.conclusion || '',
      scanCount: normalizeScanCount(data.scanCount),
      remark: data.remark || '',
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    });
  });

  if (tasks.length === 0) {
    throw new Error('Excel 文件中没有可导入的数据行。');
  }

  return tasks;
}

// 单元格值转文本：兼容富文本、日期、超链接等 exceljs 值类型
function cellToText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const p = n => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}`;
  }
  if (typeof value === 'object') {
    // 富文本 { richText: [...] }
    if (Array.isArray(value.richText)) {
      return value.richText.map(r => r.text).join('').trim();
    }
    // 超链接 { text, hyperlink }
    if (value.text !== undefined) return String(value.text).trim();
    // 公式 { result }
    if (value.result !== undefined) return cellToText(value.result);
    return String(value).trim();
  }
  return String(value).trim();
}
