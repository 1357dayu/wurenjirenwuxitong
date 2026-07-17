import { lazy, Suspense } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
// three.js 体积大,懒加载背景,移出首屏关键路径
const FloatingLines = lazy(() => import('./FloatingLines'));
import CursorSpotlight from './CursorSpotlight';
import { useMobileDetection } from './GlowCard';
import { GlassFilter } from './LiquidGlass';

// FloatingLines 背景配置：模块级常量，保证引用稳定，
// 避免每次渲染（尤其路由切换）都因 props 引用变化而销毁重建整个 three.js 场景
const LINES_ENABLED_WAVES = ['top', 'middle', 'bottom'];
// 降负载：波浪线数量 [8, 12, 16] → [4, 6, 8]，总数 36 → 18，每帧计算量减半
const LINES_LINE_COUNT = [4, 6, 8];
const LINES_LINE_DISTANCE = [8, 6, 4];
const LINES_GRADIENT = ['#1e3a8a', '#3884ff', '#cfe0ff'];

// 左侧导航：「扫描任务」为父级分组（纯标签不可跳转），下设三个子页面
const navItems = [
  { to: '/', label: '工作台', icon: GridIcon, match: p => p === '/' },
  {
    group: true,
    label: '扫描任务',
    icon: ListIcon,
    // 任务列表 + 详情 + 编辑都算「扫描任务」，但「新建任务」单独高亮
    match: p => p === '/tasks' || (p.startsWith('/tasks/') && p !== '/tasks/new'),
    children: [
      { to: '/tasks', label: '全部任务', match: p => p === '/tasks' },
      { to: '/tasks/rescan', label: '复扫任务', match: p => p.startsWith('/tasks/rescan') },
      { to: '/tasks/general', label: '通扫任务', match: p => p.startsWith('/tasks/general') }
    ]
  },
  { to: '/tasks/new', label: '新建任务', icon: PlusIcon, match: p => p === '/tasks/new' },
  { to: '/export', label: '数据导出', icon: DownloadIcon, match: p => p.startsWith('/export') }
];

// 移动端横向导航：父级分组扁平展开为三个子项
const mobileNavItems = navItems.flatMap(item => (item.group ? item.children : [item]));

export default function Layout({ children }) {
  const navigate = useNavigate();
  const isMobile = useMobileDetection();
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* 液态玻璃 SVG 滤镜（全局挂一次） */}
      <GlassFilter />
      {/* 全局鼠标光影：跟随光标在整个网页移动 */}
      <CursorSpotlight glowColor="56, 132, 255" radius={380} disabled={isMobile} />

      {/* 背景：桌面端渲染 FloatingLines 流动线条（蓝白银）；移动端降级为静态 CSS 渐变，省电省性能 */}
      {isMobile ? (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 0%, rgba(30, 58, 138, 0.55) 0%, rgba(12, 19, 34, 0.9) 55%, #070b14 100%)'
          }}
        />
      ) : (
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.5 }}>
          <Suspense fallback={null}>
            <FloatingLines
              enabledWaves={LINES_ENABLED_WAVES}
              lineCount={LINES_LINE_COUNT}
              lineDistance={LINES_LINE_DISTANCE}
              bendRadius={5.0}
              bendStrength={-0.5}
              interactive
              parallax
              linesGradient={LINES_GRADIENT}
            />
          </Suspense>
        </div>
      )}
      <div className="fixed inset-0 z-0 bg-[#070b14]/40 pointer-events-none" />

      <div className="relative z-10 flex min-h-screen">
        {/* 左侧导航 */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line/70 bg-[#0a1120]/80 backdrop-blur-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 px-5 h-16 border-b border-line/70 text-left"
          >
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand/20 border border-brand/50">
              <DroneIcon />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">扫描闭环</div>
              <div className="text-[11px] text-white/40">管理系统</div>
            </div>
          </button>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(item => {
              const active = item.match(pathname);
              // 「扫描任务」父级：纯分组标签不可跳转，命中 /tasks 开头（不含 /tasks/new）时高亮
              if (item.group) {
                return (
                  <div key={item.label}>
                    <div
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                        active ? 'text-white' : 'text-white/55'
                      }`}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </div>
                    <div className="mt-1 space-y-1">
                      {item.children.map(sub => {
                        const subActive = sub.match(pathname);
                        return (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            className={`flex items-center rounded-xl py-2 pl-10 pr-3 text-[13px] transition-all ${
                              subActive
                                ? 'bg-brand/20 text-white border border-brand/50 shadow-[0_0_18px_rgba(56,132,255,0.3)]'
                                : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <span>{sub.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    active
                      ? 'bg-brand/20 text-white border border-brand/50 shadow-[0_0_18px_rgba(56,132,255,0.3)]'
                      : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-line/70 text-[11px] text-white/35 leading-relaxed">
            数据保存在本机浏览器
            <br />
            （localStorage）
          </div>
        </aside>

        {/* 右侧主体 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* 顶部标题栏 */}
          <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-5 md:px-8 border-b border-line/70 bg-[#070b14]/70 backdrop-blur-md">
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-semibold text-white truncate">
                无人机扫描任务闭环管理系统
              </h1>
              <p className="text-[11px] md:text-xs text-white/40 truncate">
                扫描任务登记、跟踪、闭环与台账导出
              </p>
            </div>
            <button
              onClick={() => navigate('/tasks/new')}
              className="glass-btn shrink-0 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium"
            >
              <PlusIcon />
              <span className="hidden sm:inline">新建任务</span>
            </button>
          </header>

          {/* 移动端导航：扫描任务分组扁平排列为三个子项 */}
          <nav className="md:hidden flex gap-1 px-3 py-2 border-b border-line/70 bg-[#0a1120]/80 overflow-x-auto">
            {mobileNavItems.map(item => {
              const active = item.match(pathname);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${
                    active ? 'bg-brand/25 text-white border border-brand/50' : 'text-white/55 border border-transparent'
                  }`}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

/* ---------- 图标 ---------- */
function DroneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fb8ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
      <path d="M9 9 6.5 6.5M15 9l2.5-2.5M9 15l-2.5 2.5M15 15l2.5 2.5" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}
