import { Suspense, lazy, useState, useEffect, useRef } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

// 全局机器人 Portal：fixed 定位，根据 state 切换位置
// state: 'lock'（密码界面右侧中央）| 'home'（首页 Hero 右侧）| 'hidden'（其他页面隐藏）
//
// 性能优化（防发热）：
// - lock / home 状态：挂载 Spline 实例（3D 渲染）
// - hidden 状态：延迟 800ms 卸载 Spline 实例（等 opacity 渐变完成后停止 3D 渲染循环）
//   这样非首页时 Spline 完全停止渲染，大幅降低 GPU/CPU 占用
// - 从 hidden 切回 home 时立即重新挂载（接受 1-2s 加载延迟）
//
// 滚动优化（防抖动）：
// - 平时 left/top 无 transition，scroll 引起的 CSS 变量变化即时生效（但 home 状态不跟 scroll 走）
// - 状态切换时（lock→home 等）临时启用 left/top transition 1.2s 实现平滑过渡
// - 1.2s 后自动移除 transition 类，避免后续 scroll 抖动
export default function RobotPortal({ state = 'hidden' }) {
  const [splineMounted, setSplineMounted] = useState(state !== 'hidden');
  const [transitioning, setTransitioning] = useState(false);
  const prevRef = useRef(state);

  useEffect(() => {
    if (state === 'hidden') {
      const t = setTimeout(() => setSplineMounted(false), 800);
      return () => clearTimeout(t);
    } else {
      setSplineMounted(true);
    }
  }, [state]);

  // 状态切换时临时启用 left/top transition（1.2s 后移除，避免 scroll 抖动）
  useEffect(() => {
    if (prevRef.current !== state) {
      setTransitioning(true);
      const t = setTimeout(() => setTransitioning(false), 1300);
      prevRef.current = state;
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <div
      className={`robot-portal robot-portal-${state} ${transitioning ? 'robot-portal-transitioning' : ''}`}
      aria-hidden={state === 'hidden'}
    >
      {splineMounted && (
        <Suspense fallback={null}>
          <Spline
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="!w-full !h-full"
          />
        </Suspense>
      )}
      <GlobalPointerForwarder />
      <style>{`
        .robot-portal {
          position: fixed;
          width: 380px;
          height: 380px;
          z-index: 110;
          pointer-events: none;
          will-change: transform, opacity;
          /* 默认只过渡 transform 和 opacity，left/top 即时生效（避免 scroll 抖动） */
          transition:
            transform 1.1s cubic-bezier(0.65, 0, 0.35, 1),
            opacity 0.5s ease;
        }
        /* 状态切换时临时启用 left/top transition（1.3s 后移除） */
        .robot-portal-transitioning {
          transition:
            left 1.1s cubic-bezier(0.65, 0, 0.35, 1),
            top 1.1s cubic-bezier(0.65, 0, 0.35, 1),
            transform 1.1s cubic-bezier(0.65, 0, 0.35, 1),
            opacity 0.7s ease;
        }
        /* 密码界面位置：默认隐藏（中小屏） */
        .robot-portal-lock {
          right: 3%;
          top: 50%;
          transform: translateY(-50%) scale(0.88);
          opacity: 0;
        }
        /* 大屏（1100px+）：机器人定位到卡片右侧，与卡片组合整体居中 */
        /* 整体宽度 = 卡片 672 + 间距 32 + 机器人 380 = 1084 */
        /* 机器人左边 = (100vw - 1084) / 2 + 672 + 32 = (100vw - 1084) / 2 + 704 */
        @media (min-width: 1100px) {
          .robot-portal-lock {
            left: calc((100vw - 1084px) / 2 + 704px);
            right: auto;
            top: 50%;
            transform: translateY(-50%) scale(0.88);
            opacity: 0.95;
          }
        }
        /* 首页 Hero 位置：由 SplineHero 测量占位 div 位置后写入 CSS 变量，精确居中在 Hero 右侧 */
        /* 未测量前（--robot-home-ready 未设置）机器人隐藏在屏幕外，避免闪烁 */
        /* scroll 时 CSS 变量即时更新（默认 left/top 无 transition），机器人跟着 Hero 框一起滚动 */
        .robot-portal-home {
          left: var(--robot-home-left, -9999px);
          top: var(--robot-home-top, 0px);
          right: auto;
          transform: scale(1);
          opacity: var(--robot-home-ready, 0);
        }
        /* 隐藏（非首页）：与 home 同位置，仅 opacity 0 */
        .robot-portal-hidden {
          left: var(--robot-home-left, -9999px);
          top: var(--robot-home-top, 0px);
          right: auto;
          transform: scale(0.92);
          opacity: 0;
        }
        /* 移动端：调整尺寸（home 位置由 SplineHero 测量，无需额外调整） */
        @media (max-width: 768px) {
          .robot-portal {
            width: 280px;
            height: 280px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .robot-portal {
            transition: opacity 0.3s ease;
          }
        }
      `}</style>
    </div>
  );
}

// 全局鼠标转发：监听 window 鼠标移动，转发给 Spline canvas
// 让机器人在任何位置都跟随鼠标（即使 pointer-events: none）
function GlobalPointerForwarder() {
  if (typeof window === 'undefined') return null;
  // 用 setTimeout 延迟绑定，确保 Spline canvas 已渲染
  setTimeout(() => {
    const portal = document.querySelector('.robot-portal');
    if (!portal) return;
    if (portal.dataset.pointerBound === '1') return;
    portal.dataset.pointerBound = '1';

    let canvas = null;
    let raf = 0;
    const findCanvas = () => {
      canvas = portal.querySelector('canvas') || null;
      if (!canvas) raf = requestAnimationFrame(findCanvas);
    };
    findCanvas();

    const latest = { clientX: 0, clientY: 0 };
    let forwardRaf = 0;

    const forward = e => {
      if (!e.isTrusted) return;
      latest.clientX = e.clientX;
      latest.clientY = e.clientY;
      if (forwardRaf) return;
      forwardRaf = requestAnimationFrame(() => {
        forwardRaf = 0;
        if (!canvas) return;
        const opts = {
          clientX: latest.clientX,
          clientY: latest.clientY,
          bubbles: false,
          cancelable: true,
          view: window
        };
        try {
          canvas.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerType: 'mouse', pointerId: 1 }));
          canvas.dispatchEvent(new MouseEvent('mousemove', opts));
        } catch {}
      });
    };

    window.addEventListener('pointermove', forward, { passive: true });
    window.addEventListener('mousemove', forward, { passive: true });
  }, 100);

  return null;
}
