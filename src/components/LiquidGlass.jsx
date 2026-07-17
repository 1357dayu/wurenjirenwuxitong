import React from 'react';

// 液态玻璃效果（适配自 React Bits「liquid-glass」，改为深色主题 + JSX）
// 原组件为浅色照片背景设计（text-black + 白色半透明），此处调成冷白霜面、内容颜色交由 children 决定。

// 玻璃包裹层：三层叠加（背景扭曲 + 半透明白 + 内高光）
export const GlassSurface = ({
  children,
  className = '',
  style = {},
  href,
  target = '_blank',
  distort = false, // 是否启用 SVG 液态扭曲（较重，建议只在小元素/按钮上开）
  tint = 'rgba(255, 255, 255, 0.10)'
}) => {
  const glassStyle = {
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35), 0 0 24px rgba(0, 0, 0, 0.12)',
    transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 2.2)',
    ...style
  };

  const content = (
    <div
      className={`relative flex overflow-hidden transition-all duration-700 ${className}`}
      style={glassStyle}
    >
      {/* 背景模糊 / 液态扭曲层 */}
      <div
        className="absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={{
          backdropFilter: 'blur(4px) saturate(170%) brightness(1.1)',
          WebkitBackdropFilter: 'blur(4px) saturate(170%) brightness(1.1)',
          filter: distort ? 'url(#glass-distortion)' : 'none',
          isolation: 'isolate'
        }}
      />
      {/* 半透明白色着色层 */}
      <div className="absolute inset-0 z-10 rounded-[inherit]" style={{ background: tint }} />
      {/* 镜面高光斜切层 */}
      <div
        className="absolute inset-0 z-20 rounded-[inherit] overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.06) 16%, transparent 36%)',
          mixBlendMode: 'screen',
          boxShadow:
            'inset 2px 2px 2px 0 rgba(255, 255, 255, 0.45), inset -1.5px -1.5px 2px 1px rgba(255, 255, 255, 0.14)'
        }}
      />
      {/* 内容 */}
      <div className="relative z-30 w-full">{children}</div>
    </div>
  );

  return href ? (
    <a href={href} target={target} rel="noopener noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
};

// SVG 滤镜：液态扭曲（全局只需挂一次）
export const GlassFilter = () => (
  <svg style={{ display: 'none' }} aria-hidden="true">
    <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
      <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="220" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

export default GlassSurface;
