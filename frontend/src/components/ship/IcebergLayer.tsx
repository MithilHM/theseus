import React from 'react';
import { Iceberg } from '@/types/ship';

interface Props {
  icebergs: Iceberg[];
  /** Mean water Y in SVG units */
  waterY: number;
  viewW: number;
  viewH: number;
}

const SEVERITY_COLORS: Record<Iceberg['severity'], { tip: string; glow: string }> = {
  low: { tip: '#67e8f9', glow: '#06b6d4' },
  medium: { tip: '#fcd34d', glow: '#f59e0b' },
  high: { tip: '#fca5a5', glow: '#ef4444' },
};

/**
 * IcebergLayer
 * ────────────
 * Renders one SVG iceberg per item.
 *
 * Each iceberg has:
 *  - A visible tip above the waterline (coloured by severity)
 *  - A "hidden mass" gradient that fades below the waterline (hinting at hidden risk)
 *  - A clickable <g> element for Phase 3 modal wiring
 *
 * Icebergs are spread evenly across the left half of the viewport to avoid
 * overlapping the ship. The exact X positions can be overridden in the future
 * when API data includes explicit positioning.
 */
export default function IcebergLayer({ icebergs, waterY, viewW, viewH }: Props) {
  const spread = viewW * 0.65; // place icebergs in first 65% of width
  const startX = viewW * 0.05;

  return (
    <g className="iceberg-layer">
      <defs>
        {icebergs.map((berg) => {
          const { glow } = SEVERITY_COLORS[berg.severity];
          return (
            <linearGradient
              key={`grad-${berg.id}`}
              id={`iceGrad-${berg.id}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
              <stop offset="100%" stopColor={glow} stopOpacity="0" />
            </linearGradient>
          );
        })}
        {/* Clip path so submerged part stays inside water area */}
        <clipPath id="waterClip">
          <rect x={0} y={waterY} width={viewW} height={viewH - waterY} />
        </clipPath>
      </defs>

      {icebergs.map((berg, i) => {
        const cx =
          icebergs.length === 1
            ? startX + spread * 0.5
            : startX + (i / (icebergs.length - 1)) * spread;

        const { tip } = SEVERITY_COLORS[berg.severity];

        // Tip dimensions (visible above waterline)
        const tipH = 28 + i * 4; // slight variation per iceberg
        const tipW = 18 + i * 2;

        // Hidden-mass dimensions (below waterline, ~3× the tip)
        const massH = tipH * 2.8;
        const massW = tipW * 2.2;

        const tipTop = waterY - tipH;

        // Tip polygon — jagged iceberg shape
        const tipPoints = [
          [cx, tipTop],
          [cx + tipW * 0.55, tipTop + tipH * 0.35],
          [cx + tipW, waterY],
          [cx - tipW, waterY],
          [cx - tipW * 0.4, tipTop + tipH * 0.45],
        ]
          .map(([x, y]) => `${x},${y}`)
          .join(' ');

        return (
          <g
            key={berg.id}
            onClick={berg.onClick}
            style={{ cursor: 'pointer' }}
            className="iceberg-group"
            aria-label={`Iceberg: ${berg.label}`}
            role="button"
          >
            {/* ── Submerged hidden mass (clipped to water region) ───── */}
            <ellipse
              cx={cx}
              cy={waterY + massH * 0.4}
              rx={massW * 0.5}
              ry={massH * 0.5}
              fill={`url(#iceGrad-${berg.id})`}
              clipPath="url(#waterClip)"
            />

            {/* ── Visible tip ──────────────────────────────────────── */}
            <polygon
              points={tipPoints}
              fill={tip}
              opacity={0.92}
              stroke="white"
              strokeWidth={0.8}
              strokeOpacity={0.4}
            />

            {/* ── Severity glow ring at waterline ──────────────────── */}
            <ellipse
              cx={cx}
              cy={waterY}
              rx={tipW * 0.9}
              ry={4}
              fill={SEVERITY_COLORS[berg.severity].glow}
              opacity={0.25}
            />

            {/* ── Label tooltip (shown on hover via title) ─────────── */}
            <title>{berg.label}</title>

            {/* ── Severity dot badge ───────────────────────────────── */}
            <circle
              cx={cx}
              cy={tipTop - 6}
              r={4}
              fill={SEVERITY_COLORS[berg.severity].glow}
              stroke="white"
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
}
