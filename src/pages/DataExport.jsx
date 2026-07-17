import { useEffect, useMemo, useRef, useState } from 'react';
import { loadTasks, resetSampleData, importTasks } from '../lib/storage';
import { exportTasks, exportWeeklyTasks } from '../lib/exportExcel';
import { importTasksFromExcel } from '../lib/importExcel';
import { todayStr, STATUSES, isOverdue, getWeekInfo } from '../lib/constants';
import GlowCard from '../components/GlowCard';
import ConfirmModal from '../components/ConfirmModal';

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

  // 本周信息（周一为一周起点，ISO 周序号）
  const thisWeek = useMemo(() => getWeekInfo(todayStr()), []);
  // 概览卡「本周开始」固定统计当前周
  const thisWeekCount = useMemo(
    () => tasks.filter(t => thisWeek && getWeekInfo(t.planDate)?.key === thisWeek.key).length,
    [tasks, thisWeek]
  );

  // 可选周列表：数据中出现过的所有周（去重、最近的在前），并保证包含本周
  const weekOptions = useMemo(() => {
    const map = new Map();
    for (const t of tasks) {
      const info = getWeekInfo(t.planDate);
      if (!info) continue;
      if (!map.has(info.key)) map.set(info.key, { ...info, count: 0 });
      map.get(info.key).count += 1;
    }
    const list = [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
    if (thisWeek && !map.has(thisWeek.key)) list.unshift({ ...thisWeek, count: 0 });
    return list;
  }, [tasks, thisWeek]);

  // 周报选中的周（默认本周）；数据变化后若选中周不存在则回退到本周
  const [selectedWeekKey, setSelectedWeekKey] = useState(() => getWeekInfo(todayStr())?.key || '');
  useEffect(() => {
    if (thisWeek && weekOptions.length && !weekOptions.some(w => w.key === selectedWeekKey)) {
      setSelectedWeekKey(thisWeek.key);
    }
  }, [weekOptions, selectedWeekKey, thisWeek]);

  const selectedWeek = useMemo(
    () => weekOptions.find(w => w.key === selectedWeekKey) || null,
    [weekOptions, selectedWeekKey]
  );
  // 选中周的计划任务（planDate 落在该周）
  const weekTasks = useMemo(
    () => tasks.filter(t => selectedWeek && getWeekInfo(t.planDate)?.key === selectedWeek.key),
    [tasks, selectedWeek]
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

  // 导出周报：选中周的计划任务走精简 8 列美化样式，适合直接发工作群
  const handleExportWeek = async () => {
    setNotice(null);
    if (!selectedWeek || weekTasks.length === 0) return; // 按钮已置灰，这里双保险
    setExportingWeek(true);
    try {
      await exportWeeklyTasks(weekTasks, selectedWeek);
      setNotice({ type: 'success', text: `已导出周报（W${selectedWeek.week} · ${selectedWeek.label}），共 ${weekTasks.length} 条计划任务。` });
    } catch (e) {
      console.error('导出周报失败', e);
      setNotice({ type: 'error', text: '导出周报失败，请稍后重试。' });
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
        <p className="text-sm text-white/45 mt-1">按周导出周报发群汇报，或导出全部台账备份数据</p>
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

      {/* 卡片一：导出周报（可选任意周，精简 8 列，适合直接发工作群） */}
      <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-6">
        <div className="relative z-[2] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-white font-medium">导出周报</div>
            <div className="text-sm text-white/50 mt-1">可选任意周 · 精简 8 列 · 含周序号与统计 · 适合直接发到工作群</div>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <select
                value={selectedWeekKey}
                onChange={e => setSelectedWeekKey(e.target.value)}
                className="input-dark text-sm"
                aria-label="选择周"
              >
                {weekOptions.map(w => (
                  <option key={w.key} value={w.key}>
                    W{w.week} · {w.label}{w.key === thisWeek?.key ? '（本周）' : ''} · {w.count} 条
                  </option>
                ))}
              </select>
            </div>
            {selectedWeek && selectedWeek.count === 0 && (
              <div className="text-xs text-white/40 mt-1.5">该周暂无计划任务</div>
            )}
          </div>
          <button
            onClick={handleExportWeek}
            disabled={exportingWeek || weekTasks.length === 0}
            className="glass-btn shrink-0 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {exportingWeek ? '导出中…' : '↓ 导出周报'}
          </button>
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
