// 圆形玻璃返回按钮（箭头图标）
export default function BackButton({ onClick, label = '返回' }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group shrink-0 grid place-items-center w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur-sm transition-all hover:text-white hover:bg-white/10 hover:border-white/30 hover:-translate-x-0.5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
