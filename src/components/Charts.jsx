import { useState, useMemo } from 'react';

/**
 * 横向柱状图（适合显示中文标签）
 * data: [{ label, value, color?, sublabel? }]
 * 高亮：value 最大者默认更亮
 */
export function BarChart({ data = [], height = 280, max }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const maxValue = useMemo(
    () => max || (data.length ? Math.max(...data.map(d => d.value)) : 0),
    [data, max]
  );
  if (!data.length) return null;

  // 行高自适应：数据多时压缩，少时宽松
  const rowGap = 10;
  const barH = Math.max(18, Math.min(34, (height - data.length * rowGap) / data.length));
  const totalH = data.length * (barH + rowGap) + 10;

  // 默认配色：最大值用品牌蓝，其余递减
  const defaultColors = ['#3884ff', '#5a9bff', '#7bb2ff', '#9dc6ff', '#bfd9ff', '#d8e7ff'];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 600 ${totalH}`}
        preserveAspectRatio="xMinYMin meet"
        style={{ width: '100%', minWidth: 480, height: totalH }}
      >
        {data.map((d, i) => {
          const pct = maxValue > 0 ? Math.max(d.value / maxValue, 0.02) : 0;
          const barW = pct * 420; // 柱子最大宽 420
          const y = i * (barH + rowGap) + 5;
          const isHover = hoverIdx === i;
          const color = d.color || defaultColors[i % defaultColors.length];
          const opacity = hoverIdx === null ? 1 : isHover ? 1 : 0.45;
          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              opacity={opacity}
            >
              {/* 标签 */}
              <text
                x={0}
                y={y + barH / 2 + 4}
                fontSize="12"
                fill="rgba(238,242,248,0.85)"
                textAnchor="start"
                style={{ fontWeight: isHover ? 600 : 400 }}
              >
                {truncate(d.label, 16)}
              </text>
              {/* 轨道背景 */}
              <rect
                x={150}
                y={y}
                width={420}
                height={barH}
                rx={barH / 2}
                fill="rgba(255,255,255,0.05)"
              />
              {/* 柱子（带渐变 + 发光） */}
              <defs>
                <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>
              </defs>
              <rect
                x={150}
                y={y}
                width={barW}
                height={barH}
                rx={barH / 2}
                fill={`url(#bar-grad-${i})`}
                style={{
                  transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                  filter: isHover ? `drop-shadow(0 0 8px ${color})` : 'none'
                }}
              />
              {/* 数值标签 */}
              <text
                x={150 + barW + 8}
                y={y + barH / 2 + 4}
                fontSize="12"
                fill={isHover ? '#fff' : 'rgba(238,242,248,0.85)'}
                textAnchor="start"
                style={{ fontWeight: 600 }}
              >
                {d.value}{d.unit || ''}
              </text>
              {d.sublabel && (
                <text
                  x={150 + barW + 36}
                  y={y + barH / 2 + 4}
                  fontSize="11"
                  fill="rgba(238,242,248,0.45)"
                  textAnchor="start"
                >
                  {d.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/**
 * 环形饼图（donut）
 * data: [{ label, value, color }]
 * 中心显示总数 + 标签
 */
export function PieChart({ data = [], size = 200 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const innerR = r * 0.62;

  // 计算各扇区角度
  let acc = 0;
  const slices = data.map((d, i) => {
    const startAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += d.value;
    const endAngle = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const isHover = hoverIdx === i;
    const expand = isHover ? 4 : 0;
    return {
      ...d,
      i,
      startAngle,
      endAngle,
      expand,
      isHover,
      pct: (d.value / total) * 100
    };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map(s => {
          const path = arcPath(cx, cy, r + s.expand, innerR + s.expand, s.startAngle, s.endAngle);
          return (
            <path
              key={s.i}
              d={path}
              fill={s.color}
              opacity={hoverIdx === null ? 0.92 : s.isHover ? 1 : 0.4}
              onMouseEnter={() => setHoverIdx(s.i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
                filter: s.isHover ? `drop-shadow(0 0 6px ${s.color})` : 'none'
              }}
            />
          );
        })}
        {/* 中心文字 */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill="#fff"
        >
          {hoverIdx !== null ? slices[hoverIdx].value : total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(238,242,248,0.55)"
        >
          {hoverIdx !== null ? slices[hoverIdx].label : '总计'}
        </text>
      </svg>

      {/* 图例 */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {slices.map(s => (
          <div
            key={s.i}
            onMouseEnter={() => setHoverIdx(s.i)}
            onMouseLeave={() => setHoverIdx(null)}
            className="flex items-center gap-2 text-xs cursor-pointer rounded-md px-2 py-1 transition"
            style={{
              background: s.isHover ? 'rgba(255,255,255,0.06)' : 'transparent',
              opacity: hoverIdx === null ? 1 : s.isHover ? 1 : 0.55
            }}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }}
            />
            <span className="text-white/80 truncate flex-1">{s.label}</span>
            <span className="text-white/55 tabular-nums">{s.value}</span>
            <span className="text-white/40 tabular-nums">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 计算环形扇区路径
function arcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  // 处理整圆（只有一个数据点时）
  if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.0001) {
    return [
      `M ${cx + outerR} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}`,
      `M ${cx + innerR} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}`,
      'Z'
    ].join(' ');
  }
  const x1 = cx + outerR * Math.cos(startAngle);
  const y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle);
  const y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle);
  const y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle);
  const y4 = cy + innerR * Math.sin(startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ');
}

/**
 * 简易折线/柱状图（按周趋势）
 * data: [{ label, value }]
 */
export function TrendChart({ data = [], height = 180 }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 600;
  const h = height;
  const padLeft = 30;
  const padBottom = 24;
  const padTop = 12;
  const padRight = 12;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const barW = chartW / data.length;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height }}
    >
      {/* y 轴刻度线 */}
      {[0, 0.5, 1].map((t, i) => {
        const y = padTop + chartH - chartH * t;
        return (
          <g key={i}>
            <line
              x1={padLeft}
              y1={y}
              x2={w - padRight}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="2 3"
            />
            <text x={padLeft - 4} y={y + 3} fontSize="10" fill="rgba(238,242,248,0.4)" textAnchor="end">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}
      {/* 柱子 */}
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = padLeft + i * barW + barW * 0.2;
        const y = padTop + chartH - barH;
        const bw = barW * 0.6;
        const isHover = hoverIdx === i;
        return (
          <g
            key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={x}
              y={y}
              width={bw}
              height={barH}
              rx={3}
              fill="url(#trend-grad)"
              opacity={hoverIdx === null ? 0.9 : isHover ? 1 : 0.4}
              style={{
                transition: 'opacity 0.2s',
                filter: isHover ? 'drop-shadow(0 0 6px #3884ff)' : 'none'
              }}
            />
            {/* 数值 */}
            <text
              x={x + bw / 2}
              y={y - 4}
              fontSize="10"
              fill={isHover ? '#fff' : 'rgba(238,242,248,0.7)'}
              textAnchor="middle"
              style={{ fontWeight: isHover ? 600 : 400 }}
            >
              {d.value}
            </text>
            {/* x 轴标签 */}
            <text
              x={x + bw / 2}
              y={padTop + chartH + 14}
              fontSize="10"
              fill="rgba(238,242,248,0.5)"
              textAnchor="middle"
            >
              {truncate(d.label, 10)}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a9bff" />
          <stop offset="100%" stopColor="#3884ff" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
