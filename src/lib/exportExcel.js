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

// ================= 本周周报导出（精简 9 列，发工作群用） =================

// tasks 为调用方已筛好的本周任务数组；weekInfo 来自 getWeekInfo(todayStr())
// weekInfo = { week: 29, label: '7月13日 ~ 7月19日', key: '2026-07-13' }
export async function exportWeeklyTasks(tasks, weekInfo) {
  const { default: ExcelJS } = await import('exceljs');

  const list = Array.isArray(tasks) ? tasks : [];
  const info = weekInfo || { week: '', label: '', key: '' };

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
  const ws = workbook.addWorksheet(`W${info.week}周报`);

  // 第 1 行：合并大标题「无人机扫描任务周报」（14pt 加粗深蓝居中）
  ws.mergeCells(1, 1, 1, COLS);
  const titleCell = ws.getCell('A1');
  titleCell.value = '无人机扫描任务周报';
  titleCell.font = { bold: true, size: 14, color: { argb: TITLE_BLUE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // 第 2 行：合并副标题「W周序号 · 日期范围 · 共 N 条」（10pt 灰居中）
  ws.mergeCells(2, 1, 2, COLS);
  const subCell = ws.getCell('A2');
  subCell.value = `W${info.week} · ${info.label} · 共 ${list.length} 条`;
  subCell.font = { size: 10, color: { argb: GRAY } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // 第 3 行：表头（样式与全部导出一致）
  const headerRow = ws.getRow(3);
  header.forEach((h, i) => { headerRow.getCell(i + 1).value = h; });
  styleHeaderRow(headerRow, COLS);

  // 第 4 行起：数据行（样式规则同全部导出；扫描结果列换行 + 顶端对齐）
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
    colorStatusCell(row.getCell(8), t.status); // 当前状态
    if (isOverdue(t)) markOverduePlanDate(row.getCell(7)); // 开始时间
    row.getCell(9).alignment = { wrapText: true, vertical: 'top' }; // 扫描结果
  });

  // 最后一行：合并统计行「待复扫 X · 已派发 X · … · 逾期 X」（9pt 灰居中）
  // 空数组时此行紧跟表头（第 4 行），各计数全为 0
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

  // 列宽：对齐全部导出同名列，司机列宽同飞手 10，扫描结果列放宽到 40 以配合自动换行
  const widths = [18, 16, 14, 10, 10, 10, 14, 12, 40];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // 冻结前 3 行（标题 + 副标题 + 表头）
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  // 文件名：周一/周日从 label 按 ' ~ ' 拆分（形如 7月13日）
  const [mondayLabel = '', sundayLabel = ''] = String(info.label || '').split(' ~ ');
  await downloadWorkbook(
    workbook,
    `无人机扫描周报_W${info.week}_${mondayLabel}~${sundayLabel}.xlsx`
  );
}
