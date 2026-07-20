// 任务状态
export const STATUSES = ['待复扫', '已派发', '已完成', '需再次扫描', '已闭环'];

// 任务类型
export const TASK_TYPES = ['复扫', '通扫'];

// 状态颜色（项目需求第 7 节）
// 待复扫=蓝, 已派发=青蓝, 已完成=绿, 需再次扫描=琥珀, 已闭环=灰, 逾期=红
export const STATUS_STYLES = {
  待复扫: {
    text: '#7cc4ff',
    bg: 'rgba(56, 139, 253, 0.15)',
    border: 'rgba(56, 139, 253, 0.45)'
  },
  已派发: {
    text: '#5fd6e8',
    bg: 'rgba(34, 197, 224, 0.15)',
    border: 'rgba(34, 197, 224, 0.5)'
  },
  已完成: {
    text: '#62d196',
    bg: 'rgba(46, 160, 87, 0.15)',
    border: 'rgba(46, 160, 87, 0.45)'
  },
  需再次扫描: {
    text: '#f5b85c',
    bg: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.45)'
  },
  已闭环: {
    text: '#a9a4b5',
    bg: 'rgba(160, 160, 160, 0.12)',
    border: 'rgba(160, 160, 160, 0.35)'
  }
};

export const OVERDUE_STYLE = {
  text: '#ff8a8a',
  bg: 'rgba(248, 81, 73, 0.15)',
  border: 'rgba(248, 81, 73, 0.5)'
};

// 判断任务是否逾期：基准日期 = 结束时间（actualDate），无结束时间时回退开始时间（planDate）；
// 当前日期 > 基准日期当天 23:59:59 则逾期；两者都为空返回 false
// 注意：只有“已闭环”不算逾期，“需再次扫描”仍算逾期
export function isOverdue(task, today = new Date()) {
  const baseDate = task.actualDate || task.planDate;
  if (!baseDate) return false;
  if (task.status === '已闭环') return false;
  const base = new Date(baseDate + 'T23:59:59');
  return today > base;
}

// 按周分组工具：输入 'yyyy-mm-dd'，返回 { key, label, week }
// key 为该周周一的 'yyyy-mm-dd'（周以周一为起点）
// label 形如 '7月13日 ~ 7月19日'；跨月/跨年各自带月份，如 '6月29日 ~ 7月5日'
// week 为该周的 ISO 8601 周序号（世界通用，周一为一周起点）
// dateStr 为空或非法返回 null
export function getWeekInfo(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  const p = n => String(n).padStart(2, '0');
  const fmt = dd => `${dd.getFullYear()}-${p(dd.getMonth() + 1)}-${p(dd.getDate())}`;
  // 计算本周周一（getDay: 周日=0 … 周六=6）
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const label = `${monday.getMonth() + 1}月${monday.getDate()}日 ~ ${sunday.getMonth() + 1}月${sunday.getDate()}日`;
  return { key: fmt(monday), label, week: isoWeekNumber(monday) };
}

// ISO 8601 周序号：一年第一个周四所在周为第 1 周
function isoWeekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7; // 周一=0
  t.setUTCDate(t.getUTCDate() - dayNum + 3); // 移到本周周四
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((t - firstThursday) / (7 * 24 * 3600 * 1000));
}

// 按月分组：输入 'yyyy-mm-dd'，返回 { key: 'yyyy-mm', label: 'yyyy年m月', year, month }
export function getMonthInfo(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  return { key: `${year}-${String(month).padStart(2, '0')}`, label: `${year}年${month}月`, year, month };
}

// 按季度分组：输入 'yyyy-mm-dd'，返回 { key: 'yyyy-Qn', label, year, quarter }
// 1-3月→Q1, 4-6月→Q2, 7-9月→Q3, 10-12月→Q4
export function getQuarterInfo(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})-(\d{1,2})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const quarter = Math.ceil(month / 3);
  return { key: `${year}-Q${quarter}`, label: `${year}年第${quarter}季度`, year, quarter };
}

// 按年分组：输入 'yyyy-mm-dd'，返回 { key: 'yyyy', label, year }
export function getYearInfo(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const m = dateStr.trim().match(/^(\d{4})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  return { key: String(year), label: `${year}年`, year };
}

// 当前日期 yyyy-mm-dd
export function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 当前时间戳 yyyy-mm-dd HH:MM:SS
export function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 解析杆塔/区段字段，返回 { count, list, display }
// 支持「123#-126#」(=4)、「58#」(=1)、「113#-115#」(=3)、「100#,102#」(=2)、「100#-102#、105#」(=4) 等格式
// 非法或空返回 { count: 0, list: [], display: '' }
export function parseTowerCount(towerRange) {
  if (!towerRange || typeof towerRange !== 'string') {
    return { count: 0, list: [], display: String(towerRange || '') };
  }
  const s = towerRange.trim();
  if (!s) return { count: 0, list: [], display: '' };
  // 按逗号、顿号、空格切分多个区段
  const segments = s.split(/[,，、\s]+/).filter(Boolean);
  const towers = [];
  for (const seg of segments) {
    // 区段：123#-126# / 123-126 / 123#~126#（# 可在头或尾或同时存在或不出现）
    const rangeMatch = seg.match(/^(\d+)\s*#?\s*[-~至到]\s*(\d+)\s*#?$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
        for (let i = a; i <= b; i++) towers.push(i);
        continue;
      }
    }
    // 单个：58# / 58
    const singleMatch = seg.match(/^(\d+)\s*#?$/);
    if (singleMatch) {
      const n = parseInt(singleMatch[1], 10);
      if (!Number.isNaN(n)) towers.push(n);
    }
  }
  // 去重，避免重复计数
  const uniq = [...new Set(towers)].sort((a, b) => a - b);
  return {
    count: uniq.length,
    list: uniq,
    display: s
  };
}
