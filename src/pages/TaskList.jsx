import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadTasks, deleteTask, updateTask } from '../lib/storage';
import { STATUSES, getWeekInfo, isOverdue, OVERDUE_STYLE } from '../lib/constants';
import StatusBadge from '../components/StatusBadge';
import ConfirmModal from '../components/ConfirmModal';

// 客户端分页：每页条数
const PAGE_SIZE = 20;

// 列表页标题：type → 页面标题（路由传入的分页类型）
const TYPE_TITLES = { all: '扫描任务', rescan: '复扫任务', general: '通扫任务' };

// type: 'all' 全部 | 'rescan' 复扫 | 'general' 通扫（由路由传入）
export default function TaskList({ type = 'all' }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [line, setLine] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  // 删除确认弹窗状态（ConfirmModal 契约）
  const [confirm, setConfirm] = useState(null);
  // 母行展开状态：key 为 `${weekKey}|${lineName}`，默认收起
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const refresh = () => setTasks(loadTasks());
  useEffect(() => { refresh(); }, []);
  useEffect(() => { setStatus(searchParams.get('status') || ''); }, [searchParams]);
  // keyword/line/status 任一筛选变化时重置回第 1 页
  useEffect(() => { setPage(1); }, [keyword, line, status]);

  const lines = useMemo(() => [...new Set(tasks.map(t => t.lineName).filter(Boolean))], [tasks]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return tasks.filter(t => {
      // 按类型分页：rescan 只看复扫，general 只看通扫，all 不过滤
      if (type === 'rescan' && t.taskType !== '复扫') return false;
      if (type === 'general' && t.taskType !== '通扫') return false;
      if (line && t.lineName !== line) return false;
      if (status && t.status !== status) return false;
      if (kw) {
        const hay = [t.lineName, t.towerRange, t.pilot, t.pilot2]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [tasks, type, keyword, line, status]);

  // 客户端分页：页码越界（如删除后）自动回收到有效范围
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // 表格列数：基础 8 列 + 「类型」列（仅 all）+ 「扫描次数」列，用于空行/周标题行的 colSpan
  const colSpan = type === 'all' ? 10 : 9;

  // 按周分组：先分页，再对当前页任务按 planDate 所在周聚合
  // 周按 key（周一日期）倒序，最近的周在前；planDate 为空的归入最后的「未安排日期」组
  const weekGroups = useMemo(() => {
    const groups = new Map();
    for (const t of paged) {
      const info = t.planDate ? getWeekInfo(t.planDate) : null;
      const key = info ? info.key : 'unscheduled';
      // label 前冠以 ISO 周序号（如 W29），未安排日期组无序号
      const label = info ? `W${info.week} · ${info.label}` : '未安排日期';
      if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
      groups.get(key).tasks.push(t);
    }
    return [...groups.values()].sort((a, b) => {
      if (a.key === 'unscheduled') return 1;
      if (b.key === 'unscheduled') return -1;
      return a.key < b.key ? 1 : -1;
    });
  }, [paged]);

  // 周组内再按线路名（lineName）保序合并：按首次出现顺序成组；
  // lineName 为空的任务不参与合并，各自作为独立普通行；组内只有 1 条时渲染为普通行
  const mergedGroups = useMemo(() => {
    return weekGroups.map(g => {
      const rows = [];
      const byLine = new Map();
      for (const t of g.tasks) {
        const name = (t.lineName || '').trim();
        if (!name) {
          rows.push({ lineName: '', tasks: [t] });
          continue;
        }
        if (!byLine.has(name)) {
          const entry = { lineName: name, tasks: [] };
          byLine.set(name, entry);
          rows.push(entry);
        }
        byLine.get(name).tasks.push(t);
      }
      return { ...g, rows };
    });
  }, [weekGroups]);

  // 切换母行展开/收起（Set 不可变更新）
  const toggleGroup = key => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 当前分页类型的页面标题
  const title = TYPE_TITLES[type] || TYPE_TITLES.all;

  const handleDelete = (e, t) => {
    e.stopPropagation();
    // 使用 ConfirmModal 替代 window.confirm（danger 红色确认）
    setConfirm({
      title: '删除任务',
      message: `确定删除任务 ${t.taskNo}（${t.lineName}）吗？此操作不可恢复。`,
      confirmText: '删除',
      danger: true,
      onConfirm: () => {
        deleteTask(t.id);
        refresh();
        setConfirm(null);
      }
    });
  };

  // 修改状态筛选时同步回写 URL：保留其他参数，status 为空时移除该参数
  const handleStatusFilter = v => {
    setStatus(v);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (v) next.set('status', v);
      else next.delete('status');
      return next;
    });
  };

  const handleStatusChange = (e, t, newStatus) => {
    e.stopPropagation();
    updateTask(t.id, { status: newStatus });
    refresh();
  };

  const resetFilters = () => {
    setKeyword(''); setLine('');
    setStatus('');
    setSearchParams({});
  };

  const hasFilter = keyword || line || status;

  // 普通任务行渲染（合并组的子行也复用此函数；child=true 时首列缩进、整行加深底色以区分层级）
  // 子行保留全部现有交互：点击/Enter 进详情、行内改状态、查看/编辑/删除
  const renderTaskRow = (t, { child = false } = {}) => {
    const overdue = isOverdue(t);
    return (
      <tr
        key={t.id}
        onClick={() => navigate(`/tasks/${t.id}`)}
        tabIndex={0}
        role="link"
        onKeyDown={e => {
          // 键盘可达：Enter 键跳转详情（焦点在行内按钮/下拉上时不拦截）
          if (e.key === 'Enter' && e.target === e.currentTarget) navigate(`/tasks/${t.id}`);
        }}
        className={`border-b border-line/40 last:border-0 hover:bg-white/[0.03] cursor-pointer transition focus-visible:bg-white/[0.05] focus-visible:outline-none ${
          child ? 'bg-white/[0.015]' : ''
        }`}
      >
        <td className={`px-4 py-3 font-mono text-xs text-white/80 whitespace-nowrap ${child ? 'pl-7' : ''}`}>{t.taskNo}</td>
        {type === 'all' && (
          <td className="px-4 py-3 whitespace-nowrap">
            <TypeBadge taskType={t.taskType} />
          </td>
        )}
        <td className="px-4 py-3 text-white whitespace-nowrap">{t.lineName}</td>
        <td className="px-4 py-3 text-white/70 whitespace-nowrap">{t.towerRange}</td>
        <td className="px-4 py-3 text-white/70 whitespace-nowrap">{t.pilot || '—'}</td>
        <td className="px-4 py-3 text-white/70 whitespace-nowrap">{t.pilot2 || '—'}</td>
        <td className="px-4 py-3 whitespace-nowrap" style={{ color: overdue ? '#ff8a8a' : 'rgba(255,255,255,0.7)' }}>
          {t.planDate || '—'}
        </td>
        <td className="px-4 py-3 text-white/70 whitespace-nowrap">
          {t.scanCount > 0 ? `${t.scanCount} 次` : '—'}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">
          <StatusBadge status={t.status} overdue={overdue} />
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
          <div className="inline-flex items-center gap-1.5">
            <select
              value={t.status}
              onChange={e => handleStatusChange(e, t, e.target.value)}
              title="修改状态"
              aria-label="修改状态"
              className="bg-bg-raised border border-line rounded-lg px-2 py-1 text-xs text-white/80 focus:border-brand outline-none"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <IconBtn title="查看" onClick={() => navigate(`/tasks/${t.id}`)}>查看</IconBtn>
            <IconBtn title="编辑" onClick={() => navigate(`/tasks/${t.id}/edit`)}>编辑</IconBtn>
            <IconBtn title="删除" danger onClick={e => handleDelete(e, t)}>删除</IconBtn>
          </div>
        </td>
      </tr>
    );
  };

  // 合并母行渲染：同周同线路 >1 条任务聚合为一行，点击展开/收起子行
  const renderMergedGroup = (g, row) => {
    const groupKey = `${g.key}|${row.lineName}`;
    const open = expandedGroups.has(groupKey);
    // 杆塔/区段：所有子行非空 towerRange 去重后用「、 」拼接
    const towers = [...new Set(row.tasks.map(t => (t.towerRange || '').trim()).filter(Boolean))];
    // 责任/协助飞手：子行非空值去重拼接
    const pilots = [...new Set(row.tasks.map(t => (t.pilot || '').trim()).filter(Boolean))];
    const pilots2 = [...new Set(row.tasks.map(t => (t.pilot2 || '').trim()).filter(Boolean))];
    // 开始时间：全部相同显示该日期，不同显示「多个日期」
    const dates = [...new Set(row.tasks.map(t => t.planDate).filter(Boolean))];
    // 任一子行逾期 → 日期列标红 + 状态列红色「逾期」标签
    const anyOverdue = row.tasks.some(t => isOverdue(t));
    // 扫描次数：子行求和
    const totalScans = row.tasks.reduce((sum, t) => sum + (Number(t.scanCount) || 0), 0);
    // 类型徽章：全相同 → 单个；混合 → 多个并排
    const taskTypes = [...new Set(row.tasks.map(t => t.taskType).filter(Boolean))];
    return (
      <Fragment key={`merge-${g.key}-${row.lineName}`}>
        <tr
          onClick={() => toggleGroup(groupKey)}
          tabIndex={0}
          role="button"
          aria-expanded={open}
          onKeyDown={e => {
            // 键盘可达：Enter / 空格切换展开（焦点不在行本身时不拦截）
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleGroup(groupKey);
            }
          }}
          className="border-b border-line/40 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition focus-visible:bg-white/[0.05] focus-visible:outline-none"
        >
          <td className="px-4 py-3 text-xs text-white/50 whitespace-nowrap">共 {row.tasks.length} 条</td>
          {type === 'all' && (
            <td className="px-4 py-3 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5">
                {taskTypes.map(tt => <TypeBadge key={tt} taskType={tt} />)}
              </span>
            </td>
          )}
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-white font-medium">
              <span className={`inline-block text-white/50 transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
              {row.lineName}
            </span>
          </td>
          <td className="px-4 py-3 text-white/70 whitespace-normal">{towers.length ? towers.join('、 ') : '—'}</td>
          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{pilots.length ? pilots.join('、') : '—'}</td>
          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{pilots2.length ? pilots2.join('、') : '—'}</td>
          <td className="px-4 py-3 whitespace-nowrap" style={{ color: anyOverdue ? '#ff8a8a' : 'rgba(255,255,255,0.7)' }}>
            {dates.length === 1 ? dates[0] : dates.length > 1 ? '多个日期' : '—'}
          </td>
          <td className="px-4 py-3 text-white/70 whitespace-nowrap">
            {totalScans > 0 ? `${totalScans} 次` : '—'}
          </td>
          <td className="px-4 py-3 whitespace-nowrap">
            {anyOverdue ? (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
                style={{ color: OVERDUE_STYLE.text, background: OVERDUE_STYLE.bg, border: `1px solid ${OVERDUE_STYLE.border}` }}
              >
                逾期
              </span>
            ) : (
              <span className="text-white/40">—</span>
            )}
          </td>
          <td className="px-4 py-3 whitespace-nowrap text-right text-xs text-white/40">{open ? '收起' : '展开'}</td>
        </tr>
        {/* 展开的子任务行：复用普通行渲染，保留全部交互 */}
        {open && row.tasks.map(t => renderTaskRow(t, { child: true }))}
      </Fragment>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/45 mt-1">{title}主台账 · 共 {filtered.length} 条</p>
        </div>
        <button
          onClick={() => navigate('/tasks/new')}
          className="glass-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
        >
          + 新建任务
        </button>
      </div>

      {/* 筛选区 */}
      <div className="rounded-2xl glass p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索线路 / 杆塔 / 飞手"
            className="input-dark"
          />
          <SelectDark value={line} onChange={setLine} placeholder="全部线路" options={lines} />
          <SelectDark value={status} onChange={handleStatusFilter} placeholder="全部状态" options={STATUSES} />
        </div>
        {hasFilter && (
          <div className="flex justify-end">
            <button onClick={resetFilters} className="text-xs text-white/50 hover:text-white">清空筛选条件 ✕</button>
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="rounded-2xl glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/45 text-xs border-b border-line/70">
                <th className="px-4 py-3 font-medium whitespace-nowrap">任务编号</th>
                {type === 'all' && <th className="px-4 py-3 font-medium whitespace-nowrap">类型</th>}
                <th className="px-4 py-3 font-medium whitespace-nowrap">线路名称</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">杆塔 / 区段</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">责任飞手</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">协助飞手</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">开始时间</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">扫描次数</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">当前状态</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-white/40">
                    没有符合条件的任务。
                  </td>
                </tr>
              ) : (
                mergedGroups.map(g => (
                  <Fragment key={g.key}>
                    {/* 周标题行 */}
                    <tr>
                      <td colSpan={colSpan} className="px-4 py-2 bg-white/[0.04] text-xs font-medium text-white/55 whitespace-nowrap">
                        {g.label} · {g.tasks.length} 条
                      </td>
                    </tr>
                    {/* 组内按线路合并：单任务线路 → 普通行；多任务线路 → 母行 + 可展开子行 */}
                    {g.rows.map(row =>
                      row.tasks.length === 1 ? renderTaskRow(row.tasks[0]) : renderMergedGroup(g, row)
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* 分页条 */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 border-t border-line/70 text-xs text-white/50">
            <span>
              共 {filtered.length} 条 · 第 {currentPage}/{totalPages} 页
            </span>
            <div className="flex items-center gap-1.5">
              <PageBtn disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                上一页
              </PageBtn>
              {pageNumbers(totalPages, currentPage).map((n, i) =>
                n === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-white/30">…</span>
                ) : (
                  <PageBtn key={n} active={n === currentPage} onClick={() => setPage(n)}>
                    {n}
                  </PageBtn>
                )
              )}
              <PageBtn disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                下一页
              </PageBtn>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认弹窗（ConfirmModal 契约：danger 红色确认） */}
      <ConfirmModal open={!!confirm} {...confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

function SelectDark({ value, onChange, placeholder, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input-dark">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// 任务类型小徽章：复扫=蓝，通扫=青灰（圆角小标签，风格对齐 StatusBadge）
function TypeBadge({ taskType }) {
  const style =
    taskType === '复扫'
      ? { color: '#7cc4ff', background: 'rgba(56, 139, 253, 0.15)', border: '1px solid rgba(56, 139, 253, 0.45)' }
      : { color: '#9fc3d4', background: 'rgba(107, 144, 163, 0.14)', border: '1px solid rgba(107, 144, 163, 0.4)' };
  return (
    <span className="inline-block rounded-md px-2 py-0.5 text-xs whitespace-nowrap" style={style}>
      {taskType || '—'}
    </span>
  );
}

function IconBtn({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-xs border transition ${
        danger
          ? 'border-red-500/30 text-red-300/80 hover:bg-red-500/10 hover:text-red-200'
          : 'border-line text-white/65 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// 页码序列：页数少时全显，页数多时以当前页为中心开窗并用 … 省略
function pageNumbers(totalPages, current) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 2);
  const end = Math.min(totalPages - 1, current + 2);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-2.5 py-1 text-xs border transition ${
        active
          ? 'border-brand/60 bg-brand/15 text-white'
          : 'border-line text-white/65 hover:bg-white/5 hover:text-white'
      } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  );
}
