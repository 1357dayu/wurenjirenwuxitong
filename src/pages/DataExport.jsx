import { useEffect, useMemo, useRef, useState } from 'react';
import { loadTasks, resetSampleData, importTasks } from '../lib/storage';
import { exportTasks, exportPeriodTasks } from '../lib/exportExcel';
import { importTasksFromExcel } from '../lib/importExcel';
import {
  todayStr, STATUSES, isOverdue,
  getWeekInfo, getMonthInfo, getQuarterInfo, getYearInfo
} from '../lib/constants';
import GlowCard from '../components/GlowCard';
import ConfirmModal from '../components/ConfirmModal';

const PERIOD_TYPES = [
  { key: 'week', label: '按周' },
  { key: 'month', label: '按月' },
  { key: 'quarter', label: '按季度' },
  { key: 'year', label: '按年' }
];

export default function DataExport() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { setTasks(loadTasks()); }, []);

  // 内联提示条 { type: 'success' | 'error', text }
  const [notice, setNotice] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingWeek, setExportingWeek] = useState(false);

  // 导入相关状态
  const fileRef = useRef(null);
  const [importFile, setImportFile] = useState(null);
  const [importMode, setImportMode] = useState('merge'); // merge=合并导入 / replace=替换导入
  const [importing, setImporting] = useState(false);

  // 确认弹窗状态（恢复示例数据 / 替换导入 共用）
  const [confirm, setConfirm] = useState(null);

  const stats = useMemo(() => {
    const count = s => tasks.filter(t => s === t.status).length;
    return {
      total: tasks.length,
      overdue: tasks.filter(t => isOverdue(t)).length,
      byStatus: STATUSES.map(s => ({ s, n: count(s) }))
    };
  }, [tasks]);

  // 当前日期与对应 period
  const today = todayStr();

  // 当前周期信息（用于默认选中 + 显示"当前"标记）
  const thisWeek = useMemo(() => getWeekInfo(today), [today]);
  const thisMonth = useMemo(() => getMonthInfo(today), [today]);
  const thisQuarter = useMemo(() => getQuarterInfo(today), [today]);
  const thisYear = useMemo(() => getYearInfo(today), [today]);

  // 当前选中的周期类型（'week' | 'month' | 'quarter' | 'year'）
  const [periodType, setPeriodType] = useState('week');

  // 各类型对应的 planDate 解析函数
  const periodBuilders = {
    week: getWeekInfo,
    month: getMonthInfo,
    quarter: getQuarterInfo,
    year: getYearInfo
  };

  // 各类型的可选时段列表（去重 + 计数 + 最近的在前 + 保证包含当前）
  const periodOptions = useMemo(() => {
    const result = {};
    const currentMap = { week: thisWeek, month: thisMonth, quarter: thisQuarter, year: thisYear };
    for (const { key } of PERIOD_TYPES) {
      const get = periodBuilders[key];
      const current = currentMap[key];
      const map = new Map();
      for (const t of tasks) {
        const info = get(t.planDate);
        if (!info) continue;
        if (!map.has(info.key)) map.set(info.key, { ...info, count: 0 });
        map.get(info.key).count += 1;
      }
      const list = [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
      if (current && !map.has(current.key)) list.unshift({ ...current, count: 0 });
      result[key] = list;
    }
    return result;
  }, [tasks, thisWeek, thisMonth, thisQuarter, thisYear]);

  // 选中时段 key（默认每个 tab 选当前周期）
  const [selectedKey, setSelectedKey] = useState({
    week: thisWeek?.key || '',
    month: thisMonth?.key || '',
    quarter: thisQuarter?.key || '',
    year: thisYear?.key || ''
  });
  // 切换 tab 后若选中项不存在，回退到当前周期
  useEffect(() => {
    const list = periodOptions[periodType] || [];
    const currentMap = { week: thisWeek, month: thisMonth, quarter: thisQuarter, year: thisYear };
    const current = currentMap[periodType];
    if (list.length && current && !list.some(o => o.key === selectedKey[periodType])) {
      setSelectedKey(s => ({ ...s, [periodType]: current.key }));
    }
  }, [periodOptions, periodType, selectedKey, thisWeek, thisMonth, thisQuarter, thisYear]);

  const selectedPeriod = useMemo(() => {
    const list = periodOptions[periodType] || [];
    return list.find(o => o.key === selectedKey[periodType]) || null;
  }, [periodOptions, periodType, selectedKey]);

  // 当前 tab 下的任务（按 planDate 落在该周期内）
  const periodTasks = useMemo(() => {
    if (!selectedPeriod) return [];
    const get = periodBuilders[periodType];
    return tasks.filter(t => get(t.planDate)?.key === selectedPeriod.key);
  }, [tasks, periodType, selectedPeriod]);

  // 概览卡"本周开始"统计
  const thisWeekCount = useMemo(
    () => tasks.filter(t => thisWeek && getWeekInfo(t.planDate)?.key === thisWeek.key).length,
    [tasks, thisWeek]
  );

  const handleExport = async () => {
    setNotice(null);
    if (tasks.length === 0) {
      setNotice({ type: 'error', text: '当前没有任务可导出。' });
      return;
    }
    setExporting(true);
    try {
      await exportTasks(tasks);
      setNotice({ type: 'success', text: `已导出 ${tasks.length} 条任务台账。` });
    } catch (e) {
      console.error('导出失败', e);
      setNotice({ type: 'error', text: '导出失败，请稍后重试。' });
    } finally {
      setExporting(false);
    }
  };

  // 导出周报：选中周的计划任务走精简 9 列美化样式，适合直接发工作群
  const handleExportWeek = async () => {
    setNotice(null);
    if (!selectedPeriod || periodTasks.length === 0) return;
    setExportingWeek(true);
    try {
      await exportPeriodTasks(periodTasks, periodType, selectedPeriod);
      const typeLabel = PERIOD_TYPES.find(p => p.key === periodType)?.label || '';
      setNotice({
        type: 'success',
        text: `已导出${typeLabel}（${selectedPeriod.label}），共 ${periodTasks.length} 条计划任务。`
      });
    } catch (e) {
      console.error('导出失败', e);
      setNotice({ type: 'error', text: '导出失败，请稍后重试。' });
    } finally {
      setExportingWeek(false);
    }
  };

  const handleReset = () => {
    setConfirm({
      title: '恢复内置示例数据',
      message: '确定恢复为内置示例数据吗？当前本机数据将被覆盖，不可恢复。',
      confirmText: '恢复示例数据',
      danger: true,
      onConfirm: () => {
        resetSampleData();
        setTasks(loadTasks());
        setConfirm(null);
        setNotice({ type: 'success', text: '已恢复示例数据。' });
      }
    });
  };

  const handleFileChange = e => {
    setNotice(null);
    const f = e.target.files && e.target.files[0];
    setImportFile(f || null);
  };

  // 执行导入（替换模式需先经确认弹窗）
  const handleImport = () => {
    setNotice(null);
    if (!importFile) {
      setNotice({ type: 'error', text: '请先选择要导入的 .xlsx 文件。' });
      return;
    }
    if (importMode === 'replace') {
      setConfirm({
        title: '替换导入',
        message: '替换导入将覆盖本机现有全部任务数据，且不可恢复。确定继续吗？',
        confirmText: '覆盖并导入',
        danger: true,
        onConfirm: () => {
          setConfirm(null);
          doImport();
        }
      });
      return;
    }
    doImport();
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const newTasks = await importTasksFromExcel(importFile);
      const { added, skipped } = importTasks(newTasks, importMode);
      setTasks(loadTasks());
      setNotice({
        type: 'success',
        text: importMode === 'replace'
          ? `替换导入完成，已写入 ${added} 条任务。`
          : `导入完成：成功导入 ${added} 条，跳过 ${skipped} 条重复编号。`
      });
      // 清空文件选择，避免重复导入同一文件
      setImportFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      console.error('导入失败', e);
      setNotice({ type: 'error', text: e.message || '导入失败，请检查文件格式后重试。' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">数据导出</h2>
        <p className="text-sm text-white/45 mt-1">按周/月/季度/年导出报发群汇报，或导出全部台账备份数据</p>
      </div>

      {/* 内联提示条 */}
      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'success'
            ? 'border-brand/50 bg-brand/15 text-white'
            : 'border-[rgba(248,81,73,0.5)] bg-[rgba(248,81,73,0.12)] text-white'
        }`}>
          {notice.type === 'success' ? '✓ ' : '⚠ '}{notice.text}
        </div>
      )}

      {/* 卡片一：按周期导出（周/月/季度/年，精简 9 列，适合直接发工作群） */}
      <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-6">
        <div className="relative z-[2] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-white font-medium">按周期导出</div>
              <div className="text-sm text-white/50 mt-1">
                可选周/月/季度/年 · 精简 9 列 · 含周期标签与统计 · 适合直接发到工作群
              </div>
            </div>
            <button
              onClick={handleExportWeek}
              disabled={exportingWeek || periodTasks.length === 0}
              className="glass-btn shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {exportingWeek ? '导出中…' : `↓ 导出${PERIOD_TYPES.find(p => p.key === periodType)?.label.replace('按', '') || ''}报`}
            </button>
          </div>

          {/* 周期类型 tab */}
          <div className="flex items-center gap-1 rounded-xl border border-line/70 bg-[#0a1120]/80 p-1 w-fit">
            {PERIOD_TYPES.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodType(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  periodType === p.key
                    ? 'bg-brand/25 text-white border border-brand/50 shadow-[0_0_14px_rgba(56,132,255,0.3)]'
                    : 'text-white/55 hover:text-white border border-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 时段下拉 */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedKey[periodType] || ''}
              onChange={e => setSelectedKey(s => ({ ...s, [periodType]: e.target.value }))}
              className="input-dark text-sm"
              aria-label="选择时段"
            >
              {(periodOptions[periodType] || []).map(o => {
                const currentMap = { week: thisWeek, month: thisMonth, quarter: thisQuarter, year: thisYear };
                const isCurrent = o.key === currentMap[periodType]?.key;
                const prefix = periodType === 'week' ? `W${o.week} · ` : '';
                return (
                  <option key={o.key} value={o.key}>
                    {prefix}{o.label}{isCurrent ? '（当前）' : ''} · {o.count} 条
                  </option>
                );
              })}
            </select>
          </div>
          {selectedPeriod && selectedPeriod.count === 0 && (
            <div className="text-xs text-white/40">该时段暂无计划任务</div>
          )}
        </div>
      </GlowCard>

      {/* 卡片二：导出全部台账（16 列全字段，用于数据备份） */}
      <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-6">
        <div className="relative z-[2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-white font-medium">导出全部台账（数据备份）</div>
            <div className="text-sm text-white/50 mt-1">16 列全字段 · 可用于数据备份与恢复导入</div>
            <div className="text-sm text-white/50 mt-1">
              共 {stats.total} 条任务 · 文件名：无人机扫描任务台账_{todayStr()}.xlsx
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="glass-btn shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {exporting ? '导出中…' : '↓ 导出 Excel'}
          </button>
        </div>
      </GlowCard>

      {/* 导入 Excel 台账 */}
      <div className="rounded-2xl glass p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white">导入 Excel 台账</h3>
          <p className="text-xs text-white/45 mt-1">支持导入系统导出的 .xlsx 台账文件，按表头中文名自动匹配字段；旧版 13 列复扫台账文件可自动兼容导入</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-white/60 file:mr-3 file:rounded-lg file:border file:border-line file:bg-bg-raised file:px-3 file:py-1.5 file:text-sm file:text-white/70 hover:file:bg-white/5 file:cursor-pointer"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-white/70">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="accent-[#3884ff]"
            />
            合并导入（跳过重复编号）
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="accent-[#f85149]"
            />
            替换导入（覆盖现有全部数据）
          </label>
        </div>

        <div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="glass-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {importing ? '导入中…' : '↑ 开始导入'}
          </button>
        </div>
      </div>

      {/* 概览 */}
      <div className="rounded-2xl glass p-5">
        <h3 className="text-sm font-semibold text-white mb-4">全部台账概览</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="任务总数" value={stats.total} />
          <Stat label="本周开始" value={thisWeekCount} />
          {stats.byStatus.map(b => <Stat key={b.s} label={b.s} value={b.n} />)}
          <Stat label="逾期未完成" value={stats.overdue} danger={stats.overdue > 0} />
        </div>
        <div className="mt-5 pt-4 border-t border-line/60">
          <div className="text-xs text-white/45 mb-2">导出字段（共 16 项）</div>
          <div className="flex flex-wrap gap-1.5">
            {['任务编号','任务类型','线路名称','杆塔/区段','责任飞手','协助飞手','司机','开始时间','结束时间','当前状态','扫描结果','闭环结论','扫描次数','备注','创建时间','更新时间'].map(f => (
              <span key={f} className="text-[11px] text-white/55 bg-bg-raised border border-line rounded-md px-2 py-0.5">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 数据说明 */}
      <div className="rounded-2xl glass p-5 text-sm text-white/55 leading-relaxed space-y-2">
        <p>· 第一版数据保存在本机浏览器的 localStorage 中，换电脑、换浏览器或清除浏览器数据后将无法看到这些任务。</p>
        <p>· 如需多人共享同一份数据，后续可接入数据库（Supabase / 腾讯云 CloudBase 等）。</p>
        <div className="pt-2">
          <button onClick={handleReset} className="text-xs text-white/40 hover:text-white/70 underline">
            恢复内置示例数据
          </button>
        </div>
      </div>

      <ConfirmModal open={!!confirm} {...confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

function Stat({ label, value, danger }) {
  return (
    <div className="rounded-xl border border-line/60 bg-bg-raised/60 px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums" style={{ color: danger ? '#ff8a8a' : '#fff' }}>{value}</div>
      <div className="text-xs text-white/45 mt-0.5">{label}</div>
    </div>
  );
}
