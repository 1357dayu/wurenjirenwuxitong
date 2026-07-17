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
