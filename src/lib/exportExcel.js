import { todayStr, isOverdue, STATUSES } from './constants';

// ================= 模块内私有样式常量（exceljs 颜色为 ARGB 格式） =================
const BRAND_BLUE = 'FF3884FF'; // 表头品牌蓝
const BORDER_BLUE = 'FFC9D6F2'; // 单元格 thin 边框浅蓝
const STRIPE_BLUE = 'FFF4F8FF'; // 数据行隔行浅蓝填充
const OVERDUE_RED = 'FFC0392B'; // 逾期开始时间标红
const TITLE_BLUE = 'FF1F3864'; // 周报大标题深蓝
const GRAY = 'FF7F7F7F'; // 副标题 / 统计行灰

// 「当前状态」列文字着色（与页面状态徽章同语义，适配 Excel 浅色底）
const STATUS_FONT_COLORS = {
  待复扫: 'FF388BFD',
  已派发: 'FF0FA3B8',
  已完成: 'FF2EA057',
  需再次扫描: 'FFD9820B',
  已闭环: 'FF7F7F7F'
};

// ================= 模块内私有 helper =================

// 四边 thin 边框
function thinBorder() {
  const side = { style: 'thin', color: { argb: BORDER_BLUE } };
  return { top: side, left: side, bottom: side, right: side };
}

// 表头行样式：品牌蓝底、白色加粗 11pt、水平居中、thin 边框
function styleHeaderRow(row, colCount) {
  row.height = 22;
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder();
  }
}

// 数据行样式：thin 边框 + 隔行浅蓝填充（rowIndex 为 0 起的数据行序号）
function styleDataRow(row, colCount, rowIndex) {
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.border = thinBorder();
    cell.alignment = { vertical: 'middle' };
    if (rowIndex % 2 === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_BLUE } };
    }
  }
}

// 「当前状态」单元格按状态着色文字
function colorStatusCell(cell, status) {
  const argb = STATUS_FONT_COLORS[status];
  if (argb) cell.font = { color: { argb } };
}

// 逾期任务的「开始时间」单元格文字标红加粗
function markOverduePlanDate(cell) {
  cell.font = { bold: true, color: { argb: OVERDUE_RED } };
}

// 生成 xlsx 并触发浏览器下载（Blob + a 标签）
async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ================= 全部导出（数据备份，保留 16 列，导入兼容） =================

// 导出全部任务为 Excel 台账（exceljs 动态加载，不进首屏）
// 注意：表头必须位于第 1 行，上方禁止加标题/说明行（导入功能按首行解析）
export async function exportTasks(tasks) {
  const { default: ExcelJS } = await import('exceljs');

  // 表头（16 列，顺序固定，与导入解析保持一致）
  const header = [
    '任务编号',
    '任务类型',
    '线路名称',
    '杆塔 / 区段',
    '责任飞手',
    '协助飞手',
    '司机',
    '开始时间',
    '结束时间',
    '当前状态',
    '扫描结果',
    '闭环结论',
    '扫描次数',
    '备注',
    '创建时间',
    '更新时间'
  ];

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('扫描任务台账');

  // 表头（第 1 行，美化样式）
  const headerRow = ws.addRow(header);
  styleHeaderRow(headerRow, header.length);

  // 数据行（隔行浅蓝 + thin 边框；状态列着色；逾期的开始时间标红加粗）
  tasks.forEach((t, idx) => {
    const row = ws.addRow([
      t.taskNo,
      t.taskType,
      t.lineName,
      t.towerRange,
      t.pilot,
      t.pilot2,
      t.driver,
      t.planDate,
      t.actualDate,
      t.status,
      t.rescanResult,
      t.conclusion,
      t.scanCount ?? 0,
      t.remark,
      t.createdAt,
      t.updatedAt
    ]);
    styleDataRow(row, header.length, idx);
    colorStatusCell(row.getCell(10), t.status); // 当前状态
    if (isOverdue(t)) markOverduePlanDate(row.getCell(8)); // 开始时间
  });

  // 列宽（沿用原 wch 风格，按 16 列设置，司机列宽同飞手 10）
  const widths = [18, 10, 16, 14, 10, 10, 10, 14, 14, 12, 30, 30, 10, 20, 20, 20];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // 冻结首行表头
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  await downloadWorkbook(workbook, `无人机扫描任务台账_${todayStr()}.xlsx`);
}

// ================= 周期导出（周/月/季度/年，精简 9 列，发工作群用） =================

// 根据 periodType 生成大标题、副标题、sheet 名、文件名后缀
// periodType: 'week' | 'month' | 'quarter' | 'year'
function periodMeta(periodType, info) {
  const infoLabel = info?.label || '';
  if (periodType === 'week') {
    return {
      title: '无人机扫描任务周报',
      sub: `W${info?.week || ''} · ${infoLabel} · 共`,
      sheet: `W${info?.week || ''}周报`,
      fileBase: `无人机扫描周报_W${info?.week || ''}_${(infoLabel || '').replace(/ /g, '')}`
    };
  }
  if (periodType === 'month') {
    return {
      title: '无人机扫描任务月报',
      sub: `${infoLabel} · 共`,
      sheet: `${infoLabel}月报`,
      fileBase: `无人机扫描月报_${infoLabel}`
    };
  }
  if (periodType === 'quarter') {
    return {
      title: '无人机扫描任务季报',
      sub: `${infoLabel} · 共`,
      sheet: `${infoLabel}季报`,
      fileBase: `无人机扫描季报_${infoLabel}`
    };
  }
  // year
  return {
    title: '无人机扫描任务年报',
    sub: `${infoLabel} · 共`,
    sheet: `${infoLabel}年报`,
    fileBase: `无人机扫描年报_${infoLabel}`
  };
}

// 通用周期导出：tasks 为已筛好的周期内任务，periodType + periodInfo 决定标题/sheet/文件名
// periodType: 'week' | 'month' | 'quarter' | 'year'
// periodInfo: 对应 getWeekInfo/getMonthInfo/getQuarterInfo/getYearInfo 的返回
export async function exportPeriodTasks(tasks, periodType, periodInfo) {
  const { default: ExcelJS } = await import('exceljs');

  const list = Array.isArray(tasks) ? tasks : [];
  const info = periodInfo || { label: '' };
  const meta = periodMeta(periodType, info);

  // 精简 9 列（不含任务类型/结束时间/闭环结论/扫描次数/备注/时间戳）
  const header = [
    '任务编号',
    '线路名称',
    '杆塔 / 区段',
    '责任飞手',
    '协助飞手',
    '司机',
    '开始时间',
    '当前状态',
    '扫描结果'
  ];
  const COLS = header.length; // 9

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(meta.sheet);

  // 第 1 行：合并大标题
  ws.mergeCells(1, 1, 1, COLS);
  const titleCell = ws.getCell('A1');
  titleCell.value = meta.title;
  titleCell.font = { bold: true, size: 14, color: { argb: TITLE_BLUE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // 第 2 行：合并副标题
  ws.mergeCells(2, 1, 2, COLS);
  const subCell = ws.getCell('A2');
  subCell.value = `${meta.sub} ${list.length} 条`;
  subCell.font = { size: 10, color: { argb: GRAY } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // 第 3 行：表头
  const headerRow = ws.getRow(3);
  header.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  styleHeaderRow(headerRow, COLS);

  // 第 4 行起：数据行
  list.forEach((t, idx) => {
    const row = ws.addRow([
      t.taskNo,
      t.lineName,
      t.towerRange,
      t.pilot,
      t.pilot2,
      t.driver,
      t.planDate,
      t.status,
      t.rescanResult
    ]);
    styleDataRow(row, COLS, idx);
    colorStatusCell(row.getCell(8), t.status);
    if (isOverdue(t)) markOverduePlanDate(row.getCell(7));
    row.getCell(9).alignment = { wrapText: true, vertical: 'top' };
  });

  // 最后一行：合并统计行
  const counts = {};
  STATUSES.forEach(s => { counts[s] = 0; });
  let overdueCount = 0;
  list.forEach(t => {
    if (counts[t.status] !== undefined) counts[t.status] += 1;
    if (isOverdue(t)) overdueCount += 1;
  });
  const statsRowNum = 4 + list.length;
  ws.mergeCells(statsRowNum, 1, statsRowNum, COLS);
  const statsCell = ws.getCell(statsRowNum, 1);
  statsCell.value = `${STATUSES.map(s => `${s} ${counts[s]}`).join(' · ')} · 逾期 ${overdueCount}`;
  statsCell.font = { size: 9, color: { argb: GRAY } };
  statsCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(statsRowNum).height = 16;

  // 列宽
  const widths = [18, 16, 14, 10, 10, 10, 14, 12, 40];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // 冻结前 3 行
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  await downloadWorkbook(workbook, `${meta.fileBase}.xlsx`);
}

// 兼容旧 API：周报仍可通过 exportWeeklyTasks 调用，内部走统一入口
export async function exportWeeklyTasks(tasks, weekInfo) {
  return exportPeriodTasks(tasks, 'week', weekInfo);
}
