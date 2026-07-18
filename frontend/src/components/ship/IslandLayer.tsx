import React from 'react';
import { Island } from '@/types/ship';

interface Props {
  islands: Island[];
  viewW: number;
  viewH: number;
}

/**
 * IslandLayer
 * ───────────
 * Renders financial goal "ports" on the horizon.
 *
 * Each island appears at `distancePct * viewW` along the X-axis.
 * They sit near the horizon line with a small hill silhouette + lighthouse.
 * Clickable for Phase 3 wiring.
 */
export default function IslandLayer({ islands, viewW, viewH }: Props) {
  const horizonY = viewH * 0.42;

  return (
    <g className="island-layer">
      {islands.map((island) => {
        const cx = island.distancePct * viewW;
        const islandW = 70;
        const islandH = 22;

        // Silhouette: rounded hill
        const hillPath = `
          M ${cx - islandW / 2} ${horizonY + 4}
          Q ${cx - islandW * 0.2} ${horizonY - islandH}
            ${cx} ${horizonY - islandH - 4}
          Q ${cx + islandW * 0.2} ${horizonY - islandH}
            ${cx + islandW / 2} ${horizonY + 4}
          Z
        `;

        // Lighthouse tower
        const ltX = cx + 4;
        const ltBase = horizonY - islandH - 2;

        return (
          <g
            key={island.id}
            onClick={island.onClick}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label={`Goal: ${island.label}`}
            className="island-group"
          >
            <title>{island.label}</title>

            {/* Island hill */}
            <path d={hillPath} fill="#166534" opacity={0.82} />

            {/* Lighthouse body */}
            <rect
              x={ltX - 3}
              y={ltBase - 18}
              width={6}
              height={18}
              rx={1}
              fill="#f1f5f9"
              opacity={0.9}
            />
            {/* Lighthouse top */}
            <rect
              x={ltX - 4}
              y={ltBase - 22}
              width={8}
              height={5}
              rx={1}
              fill="#dc2626"
              opacity={0.9}
            />
            {/* Light beam */}
            <circle
              cx={ltX}
              cy={ltBase - 24}
              r={3}
              fill="#fde047"
              opacity={0.9}
              style={{ animation: 'lighthousePulse 2s ease-in-out infinite' }}
            />

            {/* Label below island */}
            <text
              x={cx}
              y={horizonY + 16}
              textAnchor="middle"
              fontSize={9}
              fill="#86efac"
              fontFamily="monospace"
              opacity={0.85}
            >
              {island.label}
            </text>

            {/* Dashed guide line from horizon to label */}
            <line
              x1={cx}
              y1={horizonY + 6}
              x2={cx}
              y2={horizonY + 12}
              stroke="#4ade80"
              strokeWidth={0.8}
              strokeDasharray="2 2"
              opacity={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}
