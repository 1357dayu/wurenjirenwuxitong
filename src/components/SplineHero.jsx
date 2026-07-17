import { SplineScene } from './SplineScene';
import { Spotlight } from './Spotlight';
import { GlassSurface } from './LiquidGlass';

// 工作台顶部 Hero：左侧标题文案 + 右侧可交互 3D 机器人 + 聚光灯
// 用 GlassSurface + distort：背景流动线条会透过玻璃液态折射（极致玻璃）
export default function SplineHero() {
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

        {/* 右侧 3D 机器人 */}
        <div className="flex-1 relative min-h-[260px]">
          <SplineScene
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full"
            globalPointer
          />
        </div>
      </div>
    </GlassSurface>
  );
}
