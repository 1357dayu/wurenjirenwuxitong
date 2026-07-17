import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadTasks } from '../lib/storage';
import { isOverdue } from '../lib/constants';
import GlowCard, { useMobileDetection } from '../components/GlowCard';
import StatusBadge from '../components/StatusBadge';
import SplineHero from '../components/SplineHero';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const gridRef = useRef(null);
  const isMobile = useMobileDetection();

  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  const stats = useMemo(() => {
    const count = s => tasks.filter(t => t.status === s).length;
    return {
      total: tasks.length,
      待复扫: count('待复扫'),
      已派发: count('已派发'),
      已完成: count('已完成'),
      需再次扫描: count('需再次扫描'),
      已闭环: count('已闭环'),
      逾期: tasks.filter(t => isOverdue(t)).length
    };
  }, [tasks]);

  const recent = useMemo(
    () => [...tasks].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).slice(0, 5),
    [tasks]
  );

  const cards = [
    { key: 'total', label: '扫描任务总数', value: stats.total, color: '56, 132, 255', hint: '全部登记任务' },
    { key: '待复扫', label: '待复扫', value: stats.待复扫, color: '56, 139, 253', hint: '尚未派发或执行' },
    { key: '已派发', label: '已派发', value: stats.已派发, color: '34, 197, 224', hint: '已明确责任人' },
    { key: '已完成', label: '已完成', value: stats.已完成, color: '46, 160, 87', hint: '现场扫描已完成' },
    { key: '需再次扫描', label: '需再次扫描', value: stats.需再次扫描, color: '245, 158, 11', hint: '结果不达标需重扫' },
    { key: '已闭环', label: '已闭环', value: stats.已闭环, color: '174, 185, 207', hint: '管理员已确认' },
    { key: '逾期', label: '逾期未完成', value: stats.逾期, color: '248, 81, 73', hint: '超过结束/开始时间', danger: true }
  ];

  // 统计卡跳转目标（onClick 与键盘 Enter/空格共用）
  const goCard = key => navigate(key === 'total' || key === '逾期' ? '/tasks' : `/tasks?status=${key}`);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <SplineHero />

      <div>
        <h2 className="text-xl font-semibold text-white">工作台</h2>
        <p className="text-sm text-white/45 mt-1">快速查看整体扫描任务压力与闭环情况</p>
      </div>

      {/* 统计卡片：MagicBento 发光卡 */}
      <div className="bento-section">
        <div ref={gridRef} className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {cards.map(c => (
            <GlowCard
              key={c.key}
              glowColor={c.color}
              disableAnimations={isMobile}
              enableTilt={false}
              className="min-h-[120px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              onClick={() => goCard(c.key)}
              tabIndex={0}
              role="button"
              onKeyDown={e => {
                // 键盘可达：Enter/空格触发与点击相同的跳转
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  goCard(c.key);
                }
              }}
            >
              <div className="relative z-[2] flex items-start justify-between">
                <span className="text-xs text-white/55">{c.label}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full mt-1"
                  style={{ background: `rgb(${c.color})`, boxShadow: `0 0 10px rgba(${c.color},0.8)` }}
                />
              </div>
              <div className="relative z-[2] mt-2">
                <div
                  className="text-4xl font-semibold tabular-nums"
                  style={{ color: c.danger && c.value > 0 ? '#ff8a8a' : '#ffffff' }}
                >
                  {c.value}
                </div>
                <div className="text-[11px] text-white/40 mt-1">{c.hint}</div>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>

      {/* 最近扫描任务 */}
      <div className="rounded-2xl glass overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line/70">
          <h3 className="text-sm font-semibold text-white">最近扫描任务</h3>
          <button onClick={() => navigate('/tasks')} className="text-xs text-brand hover:underline">
            查看全部 →
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-white/40">暂无任务，去“新建任务”创建一条吧。</div>
        ) : (
          <ul className="divide-y divide-line/60">
            {recent.map(t => (
              <li
                key={t.id}
                onClick={() => navigate(`/tasks/${t.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] cursor-pointer transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{t.lineName}</span>
                    <span className="text-xs text-white/40">{t.towerRange}</span>
                  </div>
                  <div className="text-xs text-white/45 mt-0.5 truncate">
                    {t.taskNo} · {[t.pilot, t.pilot2].filter(Boolean).join('、') || '未指派飞手'}
                  </div>
                </div>
                <div className="text-xs text-white/40 hidden sm:block">{t.planDate || '—'}</div>
                <StatusBadge status={t.status} overdue={isOverdue(t)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
