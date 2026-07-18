import React from 'react';
import { AnomalySpike } from '@/types/ship';

interface Props {
  spikes: AnomalySpike[];
  /** Mean water Y in SVG units */
  waterY: number;
  viewW: number;
  viewH: number;
}

/**
 * AnomalySpikes
 * ─────────────
 * Renders sharp localized wave distortions at each anomaly's positionPct.
 * Each spike is a tall jagged triangle above the normal waterline.
 * Clickable for Phase 3 modal wiring.
 */
export default function AnomalySpikes({ spikes, waterY, viewW, viewH }: Props) {
  return (
    <g className="anomaly-spikes">
      {spikes.map((spike) => {
        const x = spike.positionPct * viewW;
        const spikeH = 42; // height above normal waterline
        const spikeW = 16;

        const tipY = waterY - spikeH;

        // Jagged spike polygon
        const points = [
          [x - spikeW, waterY],
          [x - spikeW * 0.4, waterY - spikeH * 0.45],
          [x, tipY],
          [x + spikeW * 0.3, waterY - spikeH * 0.6],
          [x + spikeW, waterY],
        ]
          .map(([px, py]) => `${px},${py}`)
          .join(' ');

        return (
          <g
            key={spike.id}
            onClick={spike.onClick}
            style={{ cursor: 'pointer' }}
            role="button"
            aria-label="Anomaly event — click for details"
            className="spike-group"
          >
            <title>Anomaly — click to inspect</title>

            {/* Glow base */}
            <ellipse
              cx={x}
              cy={waterY}
              rx={spikeW * 1.4}
              ry={5}
              fill="#f97316"
              opacity={0.3}
              style={{ animation: 'spikeGlow 1.5s ease-in-out infinite' }}
            />

            {/* Spike shape */}
            <polygon
              points={points}
              fill="#f97316"
              opacity={0.88}
              stroke="#fed7aa"
              strokeWidth={0.8}
              style={{ animation: 'spikeGlow 1.5s ease-in-out infinite' }}
            />

            {/* Alert icon at tip */}
            <text
              x={x}
              y={tipY - 4}
              textAnchor="middle"
              fontSize={10}
              fill="#fed7aa"
              style={{ userSelect: 'none' }}
            >
              ⚠
            </text>
          </g>
        );
      })}
    </g>
  );
}
