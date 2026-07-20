import { useEffect, useRef } from 'react';
import { Spotlight } from './Spotlight';
import { GlassSurface } from './LiquidGlass';

// 工作台顶部 Hero：左侧标题文案 + 右侧聚光灯
// 高质量模式：3D 机器人由全局 RobotPortal 提供（Fixed 定位浮在右侧）
// 性能模式：右侧显示静态 SVG 无人机图标（不加载 Spline 3D）
// 用 GlassSurface + distort：背景流动线条会透过玻璃液态折射（极致玻璃）
// 通过 ResizeObserver 测量占位 div 位置，写入 CSS 变量供 RobotPortal 使用（精确定位 + 响应式自适应）
export default function SplineHero({ perfMode = false }) {
  const placeholderRef = useRef(null);

  useEffect(() => {
    if (perfMode) return; // 性能模式不渲染 3D，无需测量位置
    const el = placeholderRef.current;
    if (!el) return;

    // 测量 Hero 占位 div 位置，写入 CSS 变量供 RobotPortal 使用
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const root = document.documentElement;
      const robotW = window.innerWidth < 768 ? 280 : 380;
      root.style.setProperty('--robot-home-left', `${rect.left + rect.width / 2 - robotW / 2}px`);
      root.style.setProperty('--robot-home-top', `${rect.top + rect.height / 2 - robotW / 2}px`);
      root.style.setProperty('--robot-home-ready', '1');
    };
    measure();
    requestAnimationFrame(measure);

    // resize 时重新测量
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // scroll 时即时更新位置（RobotPortal 默认 left/top 无 transition，不会抖动）
    // 机器人会跟着 Hero 卡片一起滚动，始终在框里
    window.addEventListener('scroll', measure, { passive: true });

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [perfMode]);

  return (
    <GlassSurface distort tint="rgba(150, 185, 255, 0.12)" className="w-full rounded-3xl">
      {/* 聚光灯 */}
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#8fb8ff" />

      <div className="flex flex-col md:flex-row min-h-[360px] md:h-[420px]">
        {/* 左侧文案 */}
        <div className="flex-1 p-7 md:p-10 relative z-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-brand mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_rgba(56,132,255,0.9)]" />
            智能扫描 · 闭环管理
          </div>
          <h1 className="text-2xl md:text-4xl font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            无人机扫描任务闭环系统
          </h1>
          <p className="mt-7 text-sm md:text-base text-white/55 max-w-lg leading-loose">
            从发现问题、建立扫描任务、派发责任人，到现场扫描、确认闭环与台账导出，把每一条隐患都跟踪到底。
          </p>
        </div>

        {/* 右侧：高质量模式 = 3D 机器人占位；性能模式 = 静态 SVG 图标 */}
        <div ref={placeholderRef} className="flex-1 relative min-h-[260px] grid place-items-center" aria-hidden="true">
          {perfMode ? (
            // 性能模式：静态 SVG 无人机图标 + 光晕
            <div className="relative grid place-items-center">
              <div
                className="absolute w-48 h-48 rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(56,132,255,0.35), transparent 70%)' }}
              />
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#8fb8ff" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 16px rgba(56,132,255,0.6))' }}>
                <circle cx="5" cy="5" r="2" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
                <circle cx="19" cy="19" r="2" />
                <rect x="9" y="9" width="6" height="6" rx="1.5" fill="rgba(56,132,255,0.2)" />
                <path d="M9 9 6.5 6.5M15 9l2.5-2.5M9 15l-2.5 2.5M15 15l2.5 2.5" />
                <circle cx="12" cy="12" r="0.8" fill="#8fb8ff" />
              </svg>
            </div>
          ) : (
            // 高质量模式：机器人加载占位（RobotPortal 加载完成后浮在上方）
            <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">
              <span className="loader" style={{ opacity: 0.3 }} />
            </div>
          )}
        </div>
      </div>
    </GlassSurface>
  );
}
