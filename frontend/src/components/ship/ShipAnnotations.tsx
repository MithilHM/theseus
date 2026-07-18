import React from 'react';

export interface Annotation {
  id: string;
  /** SVG coordinates of the element being annotated (the tip of the leader line) */
  targetX: number;
  targetY: number;
  /** Direction the callout box extends toward */
  side: 'left' | 'right' | 'top-left' | 'top-right';
  title: string;
  lines: string[];
  onClick?: () => void;
}

interface Props {
  annotations: Annotation[];
}

const BOX_W = 130;
const BOX_PAD = 6;
const LINE_H = 12;

/**
 * ShipAnnotations
 * ───────────────
 * Renders annotation callout boxes with leader lines pointing to ship elements.
 * Each box has a title (bold) and additional detail lines.
 * The leader line runs from targetX/Y to the edge of the callout box.
 */
export default function ShipAnnotations({ annotations }: Props) {
  return (
    <g className="ship-annotations" style={{ pointerEvents: 'none' }}>
      {annotations.map((ann) => {
        const lineCount = ann.lines.length + 1; // title + detail lines
        const boxH = lineCount * LINE_H + BOX_PAD * 2 + 4;

        // Calculate box position based on direction
        let boxX: number;
        let boxY: number;

        switch (ann.side) {
          case 'left':
          case 'top-left':
            boxX = ann.targetX - BOX_W - 60;
            boxY = ann.side === 'top-left'
              ? ann.targetY - 60
              : ann.targetY - boxH / 2;
            break;
          case 'right':
          case 'top-right':
          default:
            boxX = ann.targetX + 60;
            boxY = ann.side === 'top-right'
              ? ann.targetY - 60
              : ann.targetY - boxH / 2;
            break;
        }

        // Leader line endpoints
        const lineEndX = ann.side === 'left' || ann.side === 'top-left'
          ? boxX + BOX_W
          : boxX;
        const lineEndY = boxY + boxH / 2;

        return (
          <g
            key={ann.id}
            onClick={ann.onClick}
            style={{ pointerEvents: ann.onClick ? 'all' : 'none', cursor: ann.onClick ? 'pointer' : 'default' }}
          >
            {/* Leader line */}
            <line
              x1={ann.targetX}
              y1={ann.targetY}
              x2={lineEndX}
              y2={lineEndY}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            {/* Small dot at target */}
            <circle cx={ann.targetX} cy={ann.targetY} r={2.5} fill="white" opacity={0.7} />

            {/* Callout box */}
            <rect
              x={boxX}
              y={boxY}
              width={BOX_W}
              height={boxH}
              rx={4}
              fill="rgba(15, 23, 42, 0.82)"
              stroke="rgba(148, 163, 184, 0.25)"
              strokeWidth={0.8}
            />

            {/* Title */}
            <text
              x={boxX + BOX_PAD}
              y={boxY + BOX_PAD + LINE_H - 2}
              fontSize={8}
              fontWeight="bold"
              fill="#e2e8f0"
              fontFamily="'Inter', sans-serif"
            >
              {ann.title}
            </text>

            {/* Detail lines */}
            {ann.lines.map((line, i) => (
              <text
                key={i}
                x={boxX + BOX_PAD}
                y={boxY + BOX_PAD + (i + 2) * LINE_H - 2}
                fontSize={7}
                fill="#94a3b8"
                fontFamily="'Inter', sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </g>
  );
}
