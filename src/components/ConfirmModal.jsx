import { useEffect } from 'react';

// 通用确认弹窗（液态玻璃风格），用于替代与深色主题割裂的原生 window.confirm
export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}) {
  // 按 Escape 触发取消
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // 全屏遮罩：半透明黑 + 背景模糊，点击遮罩视为取消
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="rounded-2xl glass p-5 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/65 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm text-white/60 border border-line hover:bg-white/5"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'rounded-xl px-5 py-2 text-sm font-medium text-white border border-red-400/60 bg-gradient-to-br from-red-500/45 to-red-600/25 shadow-[0_0_24px_rgba(248,81,73,0.35)] hover:from-red-500/60 hover:to-red-600/35 transition'
                : 'glass-btn rounded-xl px-5 py-2 text-sm font-medium'
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
