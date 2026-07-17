import { useEffect, useRef } from 'react';

// 全局鼠标光影：跟随光标在整个网页移动，并点亮附近的发光卡片
export default function CursorSpotlight({ glowColor = '56, 132, 255', radius = 360, disabled = false }) {
  const spotlightRef = useRef(null);

  useEffect(() => {
    if (disabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: 700px;
      height: 700px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.14) 0%,
        rgba(${glowColor}, 0.08) 15%,
        rgba(${glowColor}, 0.04) 25%,
        rgba(${glowColor}, 0.018) 45%,
        transparent 70%
      );
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
      transition: opacity 0.3s ease, left 0.12s linear, top 0.12s linear;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const proximity = radius * 0.5;
    const fadeDistance = radius * 0.75;

    // rAF 节流：mousemove 只记录最新事件，每帧最多处理一次，
    // 避免高频 mousemove 下反复 querySelectorAll + getBoundingClientRect 强制布局
    let latestEvent = null;
    let rafId = 0;

    const processMove = e => {
      const sp = spotlightRef.current;
      if (!sp) return;

      // 直接设置位置/透明度（用 CSS transition 平滑，不依赖 rAF 插值）
      sp.style.left = `${e.clientX}px`;
      sp.style.top = `${e.clientY}px`;
      sp.style.opacity = '0.7';

      // 点亮整个页面上的发光卡片（按距离）；无卡片时快速返回
      const cards = document.querySelectorAll('.magic-bento-card');
      if (cards.length === 0) return;

      cards.forEach(card => {
        const r = card.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.max(0, Math.hypot(e.clientX - cx, e.clientY - cy) - Math.max(r.width, r.height) / 2);

        let intensity = 0;
        if (dist <= proximity) intensity = 1;
        else if (dist <= fadeDistance) intensity = (fadeDistance - dist) / (fadeDistance - proximity);

        const relX = ((e.clientX - r.left) / r.width) * 100;
        const relY = ((e.clientY - r.top) / r.height) * 100;
        card.style.setProperty('--glow-x', `${relX}%`);
        card.style.setProperty('--glow-y', `${relY}%`);
        card.style.setProperty('--glow-intensity', intensity.toString());
        card.style.setProperty('--glow-radius', `${radius}px`);
      });
    };

    const handleMove = e => {
      latestEvent = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (latestEvent) {
          processMove(latestEvent);
          latestEvent = null;
        }
      });
    };

    const handleLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
      document.querySelectorAll('.magic-bento-card').forEach(card =>
        card.style.setProperty('--glow-intensity', '0')
      );
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseleave', handleLeave);
    window.addEventListener('blur', handleLeave);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('blur', handleLeave);
      if (rafId) cancelAnimationFrame(rafId);
      spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
    };
  }, [glowColor, radius, disabled]);

  return null;
}
