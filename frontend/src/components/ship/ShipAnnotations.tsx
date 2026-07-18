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
  highlightedCard?: string | null;
}

const BOX_W = 150;
const BOX_PAD = 6;
const LINE_H = 14;

/**
 * ShipAnnotations
 * ───────────────
 * Renders annotation callout boxes with leader lines pointing to ship elements.
 * Each box has a title (bold) and additional detail lines.
 * When highlightedCard matches an annotation id, it glows and scales.
 */
export default function ShipAnnotations({ annotations, highlightedCard }: Props) {
  return (
    <g className="ship-annotations" style={{ pointerEvents: 'none' }}>
      {annotations.map((ann) => {
        const lineCount = ann.lines.length + 1; // title + detail lines
        const boxH = lineCount * LINE_H + BOX_PAD * 2 + 4;
        const isHighlighted = highlightedCard === ann.id;

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

        // Highlight colours
        const boxFill = isHighlighted ? '#EFF6FF' : '#FFFFFF';
        const boxStroke = isHighlighted ? '#3B82F6' : '#E2E8F0';
        const boxStrokeWidth = isHighlighted ? 2 : 1;
        const leaderStroke = isHighlighted ? '#3B82F6' : '#94A3B8';

        return (
          <g
            key={ann.id}
            onClick={ann.onClick}
            style={{
              pointerEvents: ann.onClick ? 'all' : 'none',
              cursor: ann.onClick ? 'pointer' : 'default',
              // CSS transform for scale-up highlight
              transform: isHighlighted ? `scale(1.08)` : 'scale(1)',
              transformOrigin: `${boxX + BOX_W / 2}px ${boxY + boxH / 2}px`,
              transition: 'transform 0.2s ease',
            }}
          >
            {/* Glow halo behind box when highlighted */}
            {isHighlighted && (
              <rect
                x={boxX - 4}
                y={boxY - 4}
                width={BOX_W + 8}
                height={boxH + 8}
                rx={10}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={3}
                opacity={0.25}
              />
            )}

            {/* Leader line */}
            <line
              x1={ann.targetX}
              y1={ann.targetY}
              x2={lineEndX}
              y2={lineEndY}
              stroke={leaderStroke}
              strokeWidth={isHighlighted ? 1.5 : 1}
              strokeDasharray="2 2"
            />
            {/* Small open circle at target */}
            <circle
              cx={ann.targetX}
              cy={ann.targetY}
              r={isHighlighted ? 4.5 : 3}
              fill={isHighlighted ? '#3B82F6' : 'none'}
              stroke={leaderStroke}
              strokeWidth={1}
            />

            {/* Callout box */}
            <rect
              x={boxX}
              y={boxY}
              width={BOX_W}
              height={boxH}
              rx={6}
              fill={boxFill}
              stroke={boxStroke}
              strokeWidth={boxStrokeWidth}
              filter="url(#card-shadow)"
            />

            {/* Title */}
            <text
              x={boxX + BOX_PAD}
              y={boxY + BOX_PAD + LINE_H - 2}
              fontSize={10.5}
              fontWeight="bold"
              fill={isHighlighted ? '#1D4ED8' : '#1E293B'}
              fontFamily="'Inter', sans-serif"
            >
              {ann.title}
            </text>

            {/* Detail lines */}
            {ann.lines.map((line, i) => {
              const isRisk = line.includes('Risk: LOW');
              return (
                <text
                  key={i}
                  x={boxX + BOX_PAD}
                  y={boxY + BOX_PAD + (i + 2) * LINE_H - 2}
                  fontSize={9.5}
                  fill="#475569"
                  fontFamily="'Inter', sans-serif"
                >
                  {isRisk ? (
                    <>Risk: <tspan fill="#10B981">LOW</tspan> (15%)</>
                  ) : (
                    line
                  )}
                </text>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}
