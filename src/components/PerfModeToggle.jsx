// 性能模式开关：右上角带中文描述的小框
// perfMode=true（性能优先）：⚡ 性能模式（已关闭 3D 与背景动画）
// perfMode=false（高质量）：✨ 高质量（完整 3D 与动画）
// 半透明小框，低对比度，hover 变亮；不显眼但能看见
export default function PerfModeToggle({ perfMode, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={perfMode ? '切换到高质量模式' : '切换到性能模式'}
      title={
        perfMode
          ? '性能模式已开启 · 已关闭 3D 机器人与背景动画\n点击切换到高质量模式'
          : '高质量模式 · 完整 3D 与动画效果\n点击切换到性能模式（老旧设备推荐）'
      }
      className="fixed top-3 right-3 z-[120] flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-[11px] text-white/45 hover:text-white/90 hover:border-white/40 hover:bg-black/60 backdrop-blur-sm transition-all"
    >
      {perfMode ? <BoltIcon /> : <SparkleIcon />}
      <span>{perfMode ? '性能模式' : '高质量'}</span>
    </button>
  );
}

function BoltIcon() {
  // ⚡ 闪电图标（性能模式）
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.5 13.5h6L9 22l8.5-11.5h-6L13 2z" />
    </svg>
  );
}
function SparkleIcon() {
  // ✨ 闪光图标（高质量模式）
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
      <circle cx="19" cy="5" r="1.2" />
      <circle cx="5" cy="19" r="0.9" />
    </svg>
  );
}
