import { Suspense, lazy, useEffect, useRef } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

// 3D 场景（Spline），懒加载
// globalPointer=true 时：监听整个网页的鼠标移动并转发给机器人画布，
// 这样在页面任意位置移动鼠标，机器人都会跟随。
export function SplineScene({ scene, className, globalPointer = false }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!globalPointer) return;

    let canvas = null;
    let raf = 0; // findCanvas 轮询用的 rAF
    let forwardRaf = 0; // 鼠标转发节流用的 rAF（与 findCanvas 相互独立）
    const findCanvas = () => {
      canvas = wrapRef.current?.querySelector('canvas') || null;
      if (!canvas) raf = requestAnimationFrame(findCanvas);
    };
    findCanvas();

    // 记录最近一次真实鼠标事件的坐标，rAF 帧回调里统一派发
    const latest = { clientX: 0, clientY: 0 };

    const forward = e => {
      // 只转发真实用户事件，避免合成事件回流造成死循环
      if (!e.isTrusted) return;
      latest.clientX = e.clientX;
      latest.clientY = e.clientY;
      // 已有一帧在等待派发时直接合并（帧回调会用到最新坐标）
      if (forwardRaf) return;
      // requestAnimationFrame 节流：每帧最多派发一次，降低机器人高频重算
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
        canvas.dispatchEvent(new PointerEvent('pointermove', { ...opts, pointerType: 'mouse', pointerId: 1 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', opts));
      });
    };

    window.addEventListener('pointermove', forward, { passive: true });
    window.addEventListener('mousemove', forward, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(forwardRaf); // 取消未执行的节流帧
      window.removeEventListener('pointermove', forward);
      window.removeEventListener('mousemove', forward);
    };
  }, [globalPointer]);

  return (
    <div ref={wrapRef} className={className} style={{ width: '100%', height: '100%' }}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="loader" />
          </div>
        }
      >
        <Spline scene={scene} className="!w-full !h-full" />
      </Suspense>
    </div>
  );
}

export default SplineScene;
