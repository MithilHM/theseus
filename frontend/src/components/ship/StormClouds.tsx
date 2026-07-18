import React from 'react';

interface Props {
  /** 0–1: 0 = clear horizon, 1 = full storm */
  shortfallRisk: number;
  viewW: number;
  viewH: number;
}

/**
 * StormClouds
 * ──────────
 * Renders layered cloud shapes on the horizon.
 * Opacity, count, and darkness all scale with shortfallRisk.
 * At risk < 0.1 the clouds are essentially invisible.
 * At risk > 0.7 a second dark storm layer appears.
 */
export default function StormClouds({ shortfallRisk, viewW, viewH }: Props) {
  const baseOpacity = shortfallRisk * 0.95;
  const horizonY = viewH * 0.38; // horizon sits in upper-middle area

  // Cloud shape builder — returns a rounded-blob SVG path
  const cloudPath = (cx: number, cy: number, r: number): string => {
    return [
      `M ${cx - r} ${cy}`,
      `Q ${cx - r} ${cy - r * 1.1} ${cx - r * 0.4} ${cy - r * 0.9}`,
      `Q ${cx - r * 0.5} ${cy - r * 1.8} ${cx} ${cy - r * 1.6}`,
      `Q ${cx + r * 0.5} ${cy - r * 1.9} ${cx + r * 0.6} ${cy - r * 1.1}`,
      `Q ${cx + r * 1.2} ${cy - r * 1.0} ${cx + r} ${cy}`,
      'Z',
    ].join(' ');
  };

  const clouds = [
    // Far-left cluster
    { cx: viewW * 0.08, cy: horizonY, r: 38, layer: 1 },
    { cx: viewW * 0.15, cy: horizonY + 8, r: 52, layer: 1 },
    { cx: viewW * 0.22, cy: horizonY - 5, r: 34, layer: 1 },
    // Centre-left cluster
    { cx: viewW * 0.32, cy: horizonY + 3, r: 44, layer: 2 },
    { cx: viewW * 0.41, cy: horizonY - 8, r: 60, layer: 2 },
    // Far-right cluster (only visible at higher risk)
    { cx: viewW * 0.78, cy: horizonY + 5, r: 40, layer: 3 },
    { cx: viewW * 0.86, cy: horizonY - 3, r: 55, layer: 3 },
  ];

  return (
    <g className="storm-clouds">
      <defs>
        <linearGradient id="cloudGrad1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="cloudGrad2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {clouds.map((c, i) => {
        // Layer visibility thresholds
        const layerOpacity =
          c.layer === 1
            ? baseOpacity
            : c.layer === 2
            ? Math.max(0, (shortfallRisk - 0.25) * 1.25)
            : Math.max(0, (shortfallRisk - 0.55) * 2.0);

        if (layerOpacity < 0.02) return null;

        const fill = c.layer <= 2 ? 'url(#cloudGrad1)' : 'url(#cloudGrad2)';
        return (
          <path
            key={i}
            d={cloudPath(c.cx, c.cy, c.r)}
            fill={fill}
            opacity={layerOpacity}
            style={{
              transition: 'opacity 1.2s ease',
              filter: `blur(${c.layer}px)`,
            }}
          />
        );
      })}

      {/* Lightning flicker at very high risk */}
      {shortfallRisk > 0.75 && (
        <line
          x1={viewW * 0.38}
          y1={horizonY - 10}
          x2={viewW * 0.35}
          y2={horizonY + 30}
          stroke="#facc15"
          strokeWidth={2}
          opacity={shortfallRisk * 0.8}
          style={{ animation: 'lightningFlicker 3s ease-in-out infinite' }}
        />
      )}
    </g>
  );
}
