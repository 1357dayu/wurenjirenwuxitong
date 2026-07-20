import { useState, useRef, useEffect } from 'react';

const PASSWORD = 'wurenjizhinengxunjianzhongxin';
const SESSION_KEY = 'drone_system_auth_v1';

export function isUnlocked() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // 自动聚焦输入框
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  // 回车提交
  const handleSubmit = e => {
    e?.preventDefault();
    if (submitting || success) return;
    setSubmitting(true);
    // 模拟一点延迟，增强反馈感
    setTimeout(() => {
      if (value.trim() === PASSWORD) {
        setSuccess(true);
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
        // 等待成功动画再回调
        setTimeout(() => onUnlock && onUnlock(), 600);
      } else {
        setError(true);
        setShakeKey(k => k + 1);
        setValue('');
        setSubmitting(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 280);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] grid items-center justify-center pw-lock-container overflow-hidden ${success ? 'pw-success' : ''}`}
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, rgba(30, 58, 138, 0.6) 0%, rgba(7, 11, 20, 0.96) 55%, #050810 100%)'
      }}
    >
      {/* 动态网格背景 */}
      <div className="absolute inset-0 pointer-events-none pw-grid" />
      {/* 流动光晕 */}
      <div className="absolute inset-0 pointer-events-none pw-orbs">
        <span className="pw-orb pw-orb-1" />
        <span className="pw-orb pw-orb-2" />
        <span className="pw-orb pw-orb-3" />
      </div>
      {/* 扫描线效果 */}
      <div className="absolute inset-0 pointer-events-none pw-scanline" />

      {/* 中央卡片 */}
      <form
        key={shakeKey}
        onSubmit={handleSubmit}
        className={`relative pw-card glass rounded-3xl p-9 md:p-12 lg:p-14 w-[95%] max-w-md md:max-w-2xl lg:max-w-3xl ${error ? 'pw-shake' : ''} ${success ? 'pw-card-success' : ''}`}
        style={{ borderRadius: 28 }}
      >
        {/* 顶部图标 */}
        <div className="relative flex flex-col items-center mb-8">
          <div className="pw-drone-wrap">
            <DroneIcon />
            <div className="pw-drone-glow" />
          </div>
          <h1 className="mt-5 text-3xl md:text-4xl font-bold pw-title whitespace-nowrap">
            无人机智能巡检中心
          </h1>
          <p className="mt-2 text-xs md:text-sm text-white/55 tracking-widest">
            UAV INTELLIGENT INSPECTION CENTER
          </p>
          <div className="mt-2.5 text-xs text-white/40">
            扫描任务闭环管理系统 · 授权访问
          </div>
        </div>

        {/* 密码输入 */}
        <div className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="password"
              value={value}
              onChange={e => {
                setValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder="请输入访问密码"
              autoComplete="off"
              className={`pw-input ${error ? 'pw-input-error' : ''} ${success ? 'pw-input-success' : ''}`}
              disabled={submitting || success}
            />
            <span className="pw-input-icon">
              <LockIcon />
            </span>
          </div>

          {error && (
            <div className="pw-error-msg">
              <span>✕</span> 密码错误，请重新输入
            </div>
          )}

          <button
            type="submit"
            disabled={!value || submitting || success}
            className="pw-submit"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="pw-spinner" /> 验证中…
              </span>
            ) : success ? (
              <span>✓ 验证通过</span>
            ) : (
              <span>进 入 系 统 →</span>
            )}
          </button>
        </div>

        {/* 底部装饰 */}
        <div className="mt-7 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/30">
          <span>SECURE ACCESS</span>
          <span className="pw-dot">●</span>
          <span>AUTHENTICATED REQUIRED</span>
        </div>
      </form>

      {/* 内联样式：所有动画 / 视觉特效 */}
      <style>{`
        /* 密码界面容器：大屏（1100px+）卡片+机器人组合居中 */
        @media (min-width: 1100px) {
          .pw-lock-container {
            justify-content: start;
            /* 整体宽度 = 卡片 672 + 间距 32 + 机器人 380 = 1084 */
            padding-left: calc((100vw - 1084px) / 2);
          }
        }

        /* 动态网格背景 */
        .pw-grid {
          background-image:
            linear-gradient(rgba(56, 132, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 132, 255, 0.08) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 0%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 0%, transparent 80%);
          animation: pw-grid-move 16s linear infinite;
        }
        @keyframes pw-grid-move {
          0% { background-position: 0 0, 0 0; }
          100% { background-position: 56px 56px, 56px 56px; }
        }

        /* 流动光晕球 */
        .pw-orbs { overflow: hidden; }
        .pw-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: pw-orb-float 14s ease-in-out infinite;
        }
        .pw-orb-1 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, #3884ff, transparent 70%);
          top: -100px; left: -80px;
        }
        .pw-orb-2 {
          width: 320px; height: 320px;
          background: radial-gradient(circle, #5fd6e8, transparent 70%);
          bottom: -80px; right: -60px;
          animation-delay: -4s;
        }
        .pw-orb-3 {
          width: 280px; height: 280px;
          background: radial-gradient(circle, #7c3aed, transparent 70%);
          top: 40%; left: 60%;
          animation-delay: -8s;
          opacity: 0.3;
        }
        @keyframes pw-orb-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.08); }
          66% { transform: translate(-20px, 30px) scale(0.94); }
        }

        /* 扫描线 */
        .pw-scanline {
          background: linear-gradient(to bottom, transparent, rgba(56, 132, 255, 0.12), transparent);
          background-size: 100% 240px;
          background-repeat: no-repeat;
          background-position: 0 -240px;
          animation: pw-scan 6s linear infinite;
        }
        @keyframes pw-scan {
          0% { background-position: 0 -240px; }
          100% { background-position: 0 100vh; }
        }

        /* 卡片入场 */
        .pw-card {
          animation: pw-card-in 0.7s cubic-bezier(0.22, 1, 0.36, 1);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.6),
            0 0 80px rgba(56, 132, 255, 0.18),
            inset 2px 2px 3px rgba(255, 255, 255, 0.4),
            inset -1px -1px 3px rgba(255, 255, 255, 0.1);
        }
        @keyframes pw-card-in {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .pw-card-success {
          animation: pw-card-success 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes pw-card-success {
          to {
            opacity: 0;
            transform: scale(1.04);
            filter: blur(8px);
          }
        }

        /* 整体成功过渡 */
        .pw-success {
          animation: pw-fade-out 0.6s ease 0.3s forwards;
        }
        @keyframes pw-fade-out {
          to { opacity: 0; pointer-events: none; }
        }

        /* 标题渐变发光 */
        .pw-title {
          background: linear-gradient(90deg, #fff 0%, #8fb8ff 50%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 24px rgba(56, 132, 255, 0.4);
          animation: pw-title-shine 4s linear infinite;
          letter-spacing: 2px;
        }
        @keyframes pw-title-shine {
          to { background-position: 200% center; }
        }

        /* 无人机图标 */
        .pw-drone-wrap {
          position: relative;
          animation: pw-drone-hover 3s ease-in-out infinite;
        }
        @keyframes pw-drone-hover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .pw-drone-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle, rgba(56, 132, 255, 0.4), transparent 70%);
          filter: blur(20px);
          animation: pw-drone-pulse 2.4s ease-in-out infinite;
          z-index: -1;
        }
        @keyframes pw-drone-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }

        /* 密码输入框 */
        .pw-input {
          width: 100%;
          padding: 18px 18px 18px 52px;
          font-size: 17px;
          letter-spacing: 4px;
          color: #fff;
          background: rgba(8, 14, 26, 0.6);
          border: 1.5px solid rgba(56, 132, 255, 0.35);
          border-radius: 16px;
          outline: none;
          transition: all 0.3s;
          backdrop-filter: blur(8px);
        }
        .pw-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
          letter-spacing: 1px;
        }
        .pw-input:focus {
          border-color: #3884ff;
          box-shadow:
            0 0 0 4px rgba(56, 132, 255, 0.18),
            0 0 30px rgba(56, 132, 255, 0.5);
          background: rgba(8, 14, 26, 0.8);
        }
        .pw-input-error {
          border-color: #ff5a5a !important;
          box-shadow: 0 0 0 4px rgba(255, 90, 90, 0.15), 0 0 24px rgba(255, 90, 90, 0.4) !important;
        }
        .pw-input-success {
          border-color: #62d196 !important;
          box-shadow: 0 0 0 4px rgba(98, 209, 150, 0.18), 0 0 30px rgba(98, 209, 150, 0.4) !important;
        }
        .pw-input-icon {
          position: absolute;
          left: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(56, 132, 255, 0.8);
          pointer-events: none;
        }

        /* 提交按钮 */
        .pw-submit {
          width: 100%;
          padding: 18px 16px;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 4px;
          color: #fff;
          background: linear-gradient(135deg, rgba(90, 155, 255, 0.5), rgba(56, 132, 255, 0.3));
          border: 1px solid rgba(150, 190, 255, 0.6);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
          backdrop-filter: blur(12px);
          box-shadow:
            0 6px 20px rgba(0, 0, 0, 0.35),
            0 0 28px rgba(56, 132, 255, 0.4),
            inset 2px 2px 2px rgba(255, 255, 255, 0.4);
        }
        .pw-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(110, 170, 255, 0.6), rgba(56, 132, 255, 0.4));
          box-shadow:
            0 8px 26px rgba(0, 0, 0, 0.4),
            0 0 40px rgba(56, 132, 255, 0.6),
            inset 2px 2px 2px rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
        }
        .pw-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* 错误抖动 */
        .pw-shake {
          animation: pw-shake-anim 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
        @keyframes pw-shake-anim {
          0%, 100% { transform: translateX(0); }
          15%, 75% { transform: translateX(-10px); }
          30%, 60% { transform: translateX(10px); }
          45% { transform: translateX(-6px); }
        }

        /* 错误提示 */
        .pw-error-msg {
          font-size: 13px;
          color: #ff8a8a;
          background: rgba(255, 90, 90, 0.12);
          border: 1px solid rgba(255, 90, 90, 0.3);
          border-radius: 10px;
          padding: 8px 12px;
          animation: pw-fade-in 0.3s ease;
        }
        @keyframes pw-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* 加载 spinner */
        .pw-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: pw-spin 0.8s linear infinite;
        }
        @keyframes pw-spin {
          to { transform: rotate(360deg); }
        }

        /* 底部小圆点闪烁 */
        .pw-dot {
          color: #62d196;
          animation: pw-blink 1.5s ease-in-out infinite;
        }
        @keyframes pw-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .pw-grid, .pw-orb, .pw-scanline, .pw-title, .pw-drone-wrap, .pw-drone-glow, .pw-dot {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- 图标 ---------- */
function DroneIcon() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#8fb8ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 14px rgba(56, 132, 255, 0.8))' }}>
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="rgba(56,132,255,0.25)" />
      <path d="M9 9 6.5 6.5M15 9l2.5-2.5M9 15l-2.5 2.5M15 15l2.5 2.5" />
      <circle cx="12" cy="12" r="0.8" fill="#8fb8ff" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}
