import { useEffect, useMemo, useState } from 'react';
import { loadTasks } from '../lib/storage';
import { STATUSES, STATUS_STYLES, isOverdue, getWeekInfo, parseTowerCount, todayStr } from '../lib/constants';
import { findLineInDict, normalizeLineName } from '../lib/lineDictionary';
import GlowCard from '../components/GlowCard';
import { BarChart, PieChart, TrendChart } from '../components/Charts';

const TIME_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '近三月' }
];

export default function Statistics() {
  const [tasks, setTasks] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => { setTasks(loadTasks()); }, []);

  // 时间筛选：基于 planDate（开始时间）
  const filteredTasks = useMemo(() => {
    if (timeFilter === 'all') return tasks;
    const today = new Date(todayStr() + 'T00:00:00');
    return tasks.filter(t => {
      if (!t.planDate) return false;
      const d = new Date(t.planDate + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return false;
      if (timeFilter === 'week') {
        const wi = getWeekInfo(t.planDate);
        const tw = getWeekInfo(todayStr());
        return wi && tw && wi.key === tw.key;
      }
      if (timeFilter === 'month') {
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
      }
      if (timeFilter === 'quarter') {
        const diff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
        return diff >= 0 && diff <= 2;
      }
      return true;
    });
  }, [tasks, timeFilter]);

  // 取杆塔数：优先用《应急抢修中心运维线路汇总表》字典的权威数据
  // 字典里 500kV群兴#1线 0129-0581 = 455 塔，比 parseTowerCount 解析的 452-453 更准
  // 找不到字典项时回退到 parseTowerCount 解析
  const getTowerCount = (lineName, towerRange) => {
    const dict = findLineInDict(lineName, towerRange);
    if (dict) return dict.towerCount;
    return parseTowerCount(towerRange).count;
  };

  // 按「线路 + 杆塔区段」聚合（保留给异常排行使用，按区段维度更精准）
  // 线路名称自动归一化为字典标准名称（去空格、# 号、大小写差异），统一字段
  // - towerCount: 杆塔数（字典优先，回退 parseTowerCount）
  // - scanTotal:  该区段所有任务的 scanCount 之和（异常次数）
  // - taskCount:  该区段任务条数
  // - lastDate:   最近扫描日期（actualDate 优先，回退 planDate）
  // - lastStatus: 最近任务状态
  // - lastResult: 最近扫描结果
  // - fromDict:   杆塔数是否来自字典
  const aggregated = useMemo(() => {
    const map = new Map();
    for (const t of filteredTasks) {
      const line = normalizeLineName((t.lineName || '（未填线路）').trim());
      const range = (t.towerRange || '').trim() || '（未填区段）';
      const key = `${line}||${range}`;
      if (!map.has(key)) {
        const dict = findLineInDict(line, range);
        map.set(key, {
          key,
          lineName: line,
          towerRange: range,
          towerCount: dict ? dict.towerCount : parseTowerCount(t.towerRange).count,
          fromDict: Boolean(dict),
          station: dict ? dict.station : '',
          scanTotal: 0,
          taskCount: 0,
          lastDate: '',
          lastStatus: '',
          lastResult: '',
          _latest: ''
        });
      }
      const item = map.get(key);
      item.scanTotal += Number(t.scanCount) || 0;
      item.taskCount += 1;
      // 最近日期：actualDate 优先，否则 planDate
      const d = t.actualDate || t.planDate || '';
      if (d && d > item._latest) {
        item._latest = d;
        item.lastDate = d;
        item.lastStatus = t.status;
        item.lastResult = t.rescanResult || '';
      }
    }
    return [...map.values()];
  }, [filteredTasks]);

  // 异常扫描次数排行：按 scanTotal 降序，仅取 scanTotal > 0 的（按区段维度）
  const abnormalRank = useMemo(() => {
    return aggregated
      .filter(a => a.scanTotal > 0)
      .sort((a, b) => b.scanTotal - a.scanTotal);
  }, [aggregated]);

  // 按「线路」聚合（用于杆塔扫描数量统计）
  // - towerCount: 该线路所有「去重区段」塔数之和（同一区段被多次扫描只算一次）
  // - segmentCount: 涉及的区段数
  // - taskCount: 该线路所有任务条数
  // - segments: 区段明细（用于展示「涉及区段」列）
  // - lastDate: 最近扫描日期
  const lineAggregated = useMemo(() => {
    const map = new Map();
    for (const t of filteredTasks) {
      const line = normalizeLineName((t.lineName || '（未填线路）').trim());
      const range = (t.towerRange || '').trim() || '（未填区段）';
      if (!map.has(line)) {
        map.set(line, {
          lineName: line,
          towerCount: 0,
          segmentCount: 0,
          taskCount: 0,
          segments: [],
          lastDate: '',
          _latest: ''
        });
      }
      const item = map.get(line);
      item.taskCount += 1;
      // 按区段去重累计塔数（优先用字典权威数据）
      const exist = item.segments.find(s => s.towerRange === range);
      if (!exist) {
        const dict = findLineInDict(line, range);
        const tc = dict ? dict.towerCount : parseTowerCount(t.towerRange).count;
        item.segments.push({ towerRange: range, towerCount: tc, fromDict: Boolean(dict), station: dict ? dict.station : '' });
        item.towerCount += tc;
        item.segmentCount += 1;
      }
      const d = t.actualDate || t.planDate || '';
      if (d && d > item._latest) {
        item._latest = d;
        item.lastDate = d;
      }
    }
    return [...map.values()];
  }, [filteredTasks]);

  // 杆塔扫描数量统计：按线路聚合，按 towerCount 降序
  const towerRank = useMemo(() => {
    return [...lineAggregated].sort((a, b) => b.towerCount - a.towerCount);
  }, [lineAggregated]);

  // 概览数据
  const overview = useMemo(() => {
    // 扫描杆塔数 = 所有「去重区段」塔数之和（同一区段被多次扫描只算一次）
    const totalTowers = lineAggregated.reduce((s, a) => s + a.towerCount, 0);
    const totalScans = aggregated.reduce((s, a) => s + a.scanTotal, 0);
    const abnormalTowers = abnormalRank.length; // scanTotal > 0 的区段数
    const abnormalScans = abnormalRank.reduce((s, a) => s + a.scanTotal, 0);
    return { totalTowers, totalScans, abnormalTowers, abnormalScans, taskCount: filteredTasks.length };
  }, [lineAggregated, aggregated, abnormalRank]);

  // 状态分布（用于饼图）
  const statusPie = useMemo(() => {
    return STATUSES.map(s => ({
      label: s,
      value: filteredTasks.filter(t => t.status === s).length,
      color: STATUS_STYLES[s].text
    })).filter(d => d.value > 0);
  }, [filteredTasks]);

  // 按周趋势（用于柱状图）
  const weeklyTrend = useMemo(() => {
    const map = new Map();
    for (const t of filteredTasks) {
      const wi = getWeekInfo(t.planDate);
      if (!wi) continue;
      if (!map.has(wi.key)) map.set(wi.key, { label: `W${wi.week}`, value: 0, key: wi.key });
      map.get(wi.key).value += 1;
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filteredTasks]);

  // 异常排行柱状图数据：取前 10 条
  const abnormalBarData = useMemo(() => {
    return abnormalRank.slice(0, 10).map(a => ({
      label: `${a.lineName} ${a.towerRange}`,
      value: a.scanTotal,
      unit: '次',
      sublabel: `${a.towerCount || '?'} 塔`
    }));
  }, [abnormalRank]);

  // 杆塔数量柱状图数据：按线路聚合，取前 10 条
  const towerBarData = useMemo(() => {
    return towerRank.slice(0, 10).map(a => ({
      label: a.lineName,
      value: a.towerCount,
      unit: '塔',
      sublabel: a.segmentCount > 1 ? `共 ${a.segmentCount} 个区段` : ''
    }));
  }, [towerRank]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 标题 + 时间筛选 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">统计分析</h2>
          <p className="text-sm text-white/45 mt-1">
            杆塔扫描数量与异常扫描次数统计，按次数从多到少排序
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-line/70 bg-[#0a1120]/80 p-1">
          {TIME_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                timeFilter === f.key
                  ? 'bg-brand/25 text-white border border-brand/50 shadow-[0_0_14px_rgba(56,132,255,0.3)]'
                  : 'text-white/55 hover:text-white border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="扫描杆塔数" value={overview.totalTowers} unit="塔" color="56, 132, 255" hint="覆盖的不同杆塔数" />
        <StatCard label="扫描总次数" value={overview.totalScans} unit="次" color="34, 197, 224" hint="所有区段扫描次数之和" />
        <StatCard label="异常区段数" value={overview.abnormalTowers} unit="处" color="245, 158, 11" hint="扫描次数 ≥ 1 的区段" danger={overview.abnormalTowers > 0} />
        <StatCard label="异常扫描次数" value={overview.abnormalScans} unit="次" color="248, 81, 73" hint="重复扫描总次数" danger={overview.abnormalScans > 0} />
      </div>

      {/* 异常扫描次数排行（重点） */}
      <GlowCard glowColor="245, 158, 11" enableTilt={false} className="!p-5">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold text-white">异常扫描次数排行</h3>
              <p className="text-xs text-white/45 mt-0.5">
                扫描次数越多说明问题越难解决，按总次数从多到少排序（仅显示扫描 ≥ 1 次的区段）
              </p>
            </div>
            <span className="text-xs text-white/45">{abnormalRank.length} 处异常区段</span>
          </div>

          {abnormalRank.length === 0 ? (
            <EmptyHint text="当前筛选范围内暂无异常扫描记录" />
          ) : (
            <>
              {/* 表格 */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-white/45 border-b border-line/70">
                      <th className="py-2 pr-3 font-medium">排名</th>
                      <th className="py-2 pr-3 font-medium">线路名称</th>
                      <th className="py-2 pr-3 font-medium">杆塔/区段</th>
                      <th className="py-2 pr-3 font-medium text-right">杆塔数</th>
                      <th className="py-2 pr-3 font-medium text-right">扫描次数</th>
                      <th className="py-2 pr-3 font-medium">最近状态</th>
                      <th className="py-2 pr-3 font-medium">最近扫描</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abnormalRank.slice(0, 20).map((a, i) => (
                      <tr
                        key={a.key}
                        className="border-b border-line/40 hover:bg-white/5 transition"
                      >
                        <td className="py-2.5 pr-3">
                          <RankBadge rank={i + 1} />
                        </td>
                        <td className="py-2.5 pr-3 text-white/85">{a.lineName}</td>
                        <td className="py-2.5 pr-3 text-white/70 font-mono text-xs">{a.towerRange}</td>
                        <td className="py-2.5 pr-3 text-right text-white/60 tabular-nums">{a.towerCount || '-'}</td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className="tabular-nums font-semibold" style={{ color: getRankColor(a.scanTotal) }}>
                            {a.scanTotal} 次
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {a.lastStatus && <StatusPill status={a.lastStatus} />}
                        </td>
                        <td className="py-2.5 pr-3 text-white/55 text-xs tabular-nums">{a.lastDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {abnormalRank.length > 20 && (
                  <div className="text-xs text-white/40 mt-2 text-center">仅显示前 20 条，柱状图展示前 10 条</div>
                )}
              </div>

              {/* 柱状图 */}
              <div className="mt-6 pt-4 border-t border-line/40">
                <div className="text-xs text-white/55 mb-2">扫描次数柱状图（前 10）</div>
                <BarChart data={abnormalBarData} height={Math.min(360, abnormalBarData.length * 44 + 20)} />
              </div>
            </>
          )}
        </div>
      </GlowCard>

      {/* 杆塔扫描数量统计 */}
      <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-5">
        <div className="relative z-[2]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-base font-semibold text-white">杆塔扫描数量统计</h3>
              <p className="text-xs text-white/45 mt-0.5">
                按线路聚合，同一线路所有去重区段的塔数累加；同一区段被多次扫描只算一次
              </p>
            </div>
            <span className="text-xs text-white/45">{towerRank.length} 条线路</span>
          </div>

          {towerRank.length === 0 ? (
            <EmptyHint text="当前筛选范围内暂无任务" />
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-white/45 border-b border-line/70">
                      <th className="py-2 pr-3 font-medium">线路名称</th>
                      <th className="py-2 pr-3 font-medium text-right">杆塔数</th>
                      <th className="py-2 pr-3 font-medium text-right">区段数</th>
                      <th className="py-2 pr-3 font-medium">涉及区段</th>
                      <th className="py-2 pr-3 font-medium text-right">任务条数</th>
                      <th className="py-2 pr-3 font-medium">最近扫描</th>
                    </tr>
                  </thead>
                  <tbody>
                    {towerRank.slice(0, 20).map((a, i) => (
                      <tr key={a.lineName} className="border-b border-line/40 hover:bg-white/5 transition">
                        <td className="py-2.5 pr-3 text-white/85">{a.lineName}</td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className="tabular-nums font-semibold text-white">
                            {a.towerCount} 塔
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-white/70 tabular-nums">{a.segmentCount}</td>
                        <td className="py-2.5 pr-3 text-white/55 text-xs">
                          {a.segments.map(s => (
                            <span key={s.towerRange} className="inline-block mr-2">
                              <span className="font-mono">{s.towerRange}</span>
                              <span className="text-white/35 ml-1">
                                ({s.station || '未登记'}·{s.towerCount}塔{s.fromDict ? '' : '★'})
                              </span>
                            </span>
                          ))}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-white/55 tabular-nums">{a.taskCount} 条</td>
                        <td className="py-2.5 pr-3 text-white/55 text-xs tabular-nums">{a.lastDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {towerRank.length > 20 && (
                  <div className="text-xs text-white/40 mt-2 text-center">仅显示前 20 条</div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-line/40">
                <div className="text-xs text-white/55 mb-2">杆塔数量柱状图（前 10，按线路聚合）</div>
                <BarChart data={towerBarData} height={Math.min(360, towerBarData.length * 44 + 20)} />
              </div>
            </>
          )}
        </div>
      </GlowCard>

      {/* 状态分布 + 周趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-5">
          <div className="relative z-[2]">
            <h3 className="text-base font-semibold text-white">任务状态分布</h3>
            <p className="text-xs text-white/45 mt-0.5">当前筛选范围内各状态任务数量占比</p>
            <div className="mt-4">
              {statusPie.length > 0 ? (
                <PieChart data={statusPie} size={200} />
              ) : (
                <EmptyHint text="暂无任务数据" />
              )}
            </div>
          </div>
        </GlowCard>

        <GlowCard glowColor="56, 132, 255" enableTilt={false} className="!p-5">
          <div className="relative z-[2]">
            <h3 className="text-base font-semibold text-white">按周扫描任务趋势</h3>
            <p className="text-xs text-white/45 mt-0.5">按开始时间所在周统计任务条数</p>
            <div className="mt-4">
              {weeklyTrend.length > 0 ? (
                <TrendChart data={weeklyTrend} height={200} />
              ) : (
                <EmptyHint text="暂无带开始时间的任务" />
              )}
            </div>
          </div>
        </GlowCard>
      </div>

      {/* 说明 */}
      <div className="rounded-2xl glass p-5 text-xs text-white/50 leading-relaxed space-y-1.5">
        <p>· 「扫描次数」取自任务的 scanCount 字段，每次任务进入「已完成」状态时自动 +1；同一区段多次扫描说明问题未解决。</p>
        <p>· 「杆塔数」优先采用《应急抢修中心运维线路汇总表》字典的权威数据（如 500kV群兴#1线 0129-0581 = 455 塔）；字典未收录的区段用 parseTowerCount 解析（如 115#-117# → 3 塔），并在「涉及区段」列标 <span className="text-brand">★</span> 区分。</p>
        <p>· 「杆塔扫描数量统计」按<strong className="text-white/70">线路</strong>聚合：同一线路所有去重区段的塔数累加；同一区段被多次扫描只算一次，不会重复计入。</p>
        <p>· 「异常区段」指扫描次数 ≥ 1 的线路 + 区段组合，需重点关注。</p>
        <p>· 时间筛选基于「开始时间」字段；无开始时间的任务不计入时间筛选范围。</p>
        <p>· 新建任务时在「线路名称」输入框输入 1 个字/字母即可弹出字典可选线路，选中后自动带出杆塔/区段，保证统计规范统一。</p>
      </div>
    </div>
  );
}

/* ---------- 子组件 ---------- */
function StatCard({ label, value, unit, color, hint, danger }) {
  return (
    <div
      className="rounded-2xl border p-4 relative overflow-hidden"
      style={{
        borderColor: `rgba(${color}, 0.35)`,
        background: `linear-gradient(135deg, rgba(${color}, 0.12), rgba(${color}, 0.02))`,
        boxShadow: `inset 0 0 0 1px rgba(${color}, 0.08)`
      }}
    >
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl"
        style={{ background: `rgba(${color}, 0.3)` }}
      />
      <div className="relative">
        <div className="text-xs text-white/55">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: danger ? `rgb(${color})` : '#fff' }}
          >
            {value}
          </span>
          <span className="text-xs text-white/45">{unit}</span>
        </div>
        <div className="text-[11px] text-white/40 mt-1">{hint}</div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  const color = rank === 1 ? '#ff8a8a' : rank === 2 ? '#f5b85c' : rank === 3 ? '#ffd66b' : 'rgba(238,242,248,0.5)';
  return (
    <span
      className="inline-grid place-items-center w-6 h-6 rounded-full text-xs font-semibold tabular-nums"
      style={{
        background: rank <= 3 ? `rgba(${rank === 1 ? '248,81,73' : rank === 2 ? '245,158,11' : '255,214,107'}, 0.18)` : 'rgba(255,255,255,0.06)',
        color,
        border: `1px solid ${color}`,
      }}
    >
      {rank}
    </span>
  );
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status];
  if (!s) return <span className="text-xs text-white/45">{status || '-'}</span>;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
      style={{ color: s.text, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {status}
    </span>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="py-12 text-center text-sm text-white/40">
      <svg className="mx-auto mb-2 opacity-40" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3v18h18" strokeLinecap="round" />
        <path d="M7 14l3-3 3 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {text}
    </div>
  );
}

function getRankColor(scanTotal) {
  if (scanTotal >= 5) return '#ff8a8a';
  if (scanTotal >= 3) return '#f5b85c';
  if (scanTotal >= 2) return '#ffd66b';
  return '#5fd6e8';
}
