'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShipViewProps } from '@/types/ship';
import WaterLayer from './WaterLayer';
import StormClouds from './StormClouds';
import GreekGalley from './GreekGalley';
import IcebergLayer from './IcebergLayer';
import IslandLayer from './IslandLayer';
import AnomalySpikes from './AnomalySpikes';
import ShipAnnotations, { Annotation } from './ShipAnnotations';

const VIEW_W = 900;
const VIEW_H = 500;
const MAX_RUNWAY_DAYS = 365;

interface ExtendedShipViewProps extends ShipViewProps {
  /** Callback when water body is clicked (opens Cash Flow Trend) */
  onWaterClick?: () => void;
  /** Callback when ship is clicked (opens Runway metric) */
  onShipClick?: () => void;
  /** Show annotation labels */
  showAnnotations?: boolean;
}

/**
 * ShipView (v2 — Greek Galley)
 * ─────────────────────────────
 * Redesigned to match the reference PRD image:
 * - Light sky gradient (white-blue, day scene)
 * - Flat-shaded Greek galley (trireme) with oars and square sail
 * - Annotation callout boxes for each metric element
 * - Storm clouds on the horizon (top-right)
 * - Icebergs below waterline with labels
 * - Captain (Gemma) reacts when recommendationSummary changes
 *
 * Single viewBox="0 0 900 500" — scales to any container.
 */
export default function ShipView({
  cashBalance,
  maxCashBalance,
  runwayDays,
  forecastVolatility,
  shortfallRisk,
  icebergs,
  islands,
  anomalySpikes,
  recommendationSummary,
  onWaterClick,
  onShipClick,
  showAnnotations = true,
}: ExtendedShipViewProps) {
  // ── Derived values ────────────────────────────────────────────────────────
  const waterLevelFraction = Math.min(1, Math.max(0, cashBalance / maxCashBalance));
  const runwayFraction = Math.min(1, runwayDays / MAX_RUNWAY_DAYS);

  const clampedLevel = Math.max(0.3, Math.min(0.7, waterLevelFraction));
  const waterY = VIEW_H * (1 - clampedLevel); // e.g. 0.58 → waterY = 290

  // Ship centre position
  const shipCX = VIEW_W * 0.48;

  // ── Captain reaction animation ────────────────────────────────────────────
  const [captainReacting, setCaptainReacting] = useState(false);
  const prevSummaryRef = useRef<string>('');

  useEffect(() => {
    if (prevSummaryRef.current !== recommendationSummary && prevSummaryRef.current !== '') {
      setCaptainReacting(true);
      const t = setTimeout(() => setCaptainReacting(false), 1400);
      return () => clearTimeout(t);
    }
    prevSummaryRef.current = recommendationSummary;
  }, [recommendationSummary]);

  const captainClass = captainReacting ? 'captain-reacting' : '';

  // ── Sky gradient (light blue/white for day scene) ─────────────────────────
  // Risk darkens the sky slightly
  const skyLight = Math.max(72, 92 - shortfallRisk * 30);
  const skyMid = Math.max(80, 96 - shortfallRisk * 25);

  // ── Annotations (matching reference image layout) ─────────────────────────
  const draftPx = 2 + runwayFraction * 12;
  const hullTop = waterY - draftPx - 52;
  const captainX = shipCX - 155;
  const captainY = hullTop - 10;

  const annotations: Annotation[] = showAnnotations ? [
    {
      id: 'ann-captain',
      targetX: captainX,
      targetY: captainY,
      side: 'left',
      title: 'Gemma as captain',
      lines: ['Graphical'],
      onClick: onShipClick,
    },
    {
      id: 'ann-storm',
      targetX: VIEW_W * 0.72,
      targetY: VIEW_H * 0.18,
      side: 'top-right',
      title: 'Predicted shortfall risk',
      lines: [
        'Storm clouds on the horizon',
        `Risk: ${shortfallRisk < 0.3 ? 'LOW' : shortfallRisk < 0.6 ? 'MEDIUM' : 'HIGH'} (${Math.round(shortfallRisk * 100)}%)`,
      ],
    },
    {
      id: 'ann-water',
      targetX: VIEW_W * 0.14,
      targetY: waterY + 4,
      side: 'left',
      title: 'Water level',
      lines: [
        `Balance: ₹${(cashBalance / 100).toFixed(0).replace(/\B(?=(\d+)+(?!\d))/g, ',')}`,
      ],
      onClick: onWaterClick,
    },
    {
      id: 'ann-runway',
      targetX: shipCX + 100,
      targetY: waterY - 70,
      side: 'right',
      title: 'Runway:',
      lines: [`${runwayDays} Days`],
      onClick: onShipClick,
    },
    {
      id: 'ann-turbulence',
      targetX: VIEW_W * 0.68,
      targetY: waterY + 16,
      side: 'right',
      title: 'Water turbulence',
      lines: [
        'Confidence (P10/P90):',
        forecastVolatility < 0.35 ? 'Narrow Band' : forecastVolatility < 0.65 ? 'Medium Band' : 'Wide Band',
      ],
      onClick: onWaterClick,
    },
  ] : [];

  return (
    <div className="ship-view-container w-full h-full select-none">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="THESEUS Greek Galley — interactive financial overview"
        role="img"
        style={{ display: 'block', transition: 'all 0.8s ease' }}
      >
        <defs>
          {/* Light sky gradient (day scene) */}
          <linearGradient id="skyGradV2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`hsl(205, 55%, ${skyLight}%)`} />
            <stop offset="60%" stopColor={`hsl(208, 50%, ${skyMid}%)`} />
            <stop offset="100%" stopColor={`hsl(210, 45%, ${Math.max(65, skyMid - 10)}%)`} />
          </linearGradient>

          {/* Horizon glow */}
          <linearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* ── Sky background ────────────────────────────────────────────── */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#skyGradV2)" />

        {/* Horizon atmospheric haze */}
        <rect
          x={0}
          y={waterY - 30}
          width={VIEW_W}
          height={30}
          fill="url(#horizonGlow)"
          opacity={0.4}
        />

        {/* ── Storm clouds (top-right, subtle at low risk) ──────────────── */}
        <StormClouds
          shortfallRisk={shortfallRisk}
          viewW={VIEW_W}
          viewH={VIEW_H}
        />

        {/* ── Islands / ports on horizon ────────────────────────────────── */}
        <IslandLayer islands={islands} viewW={VIEW_W} viewH={VIEW_H} />

        {/* ── Water body ───────────────────────────────────────────────── */}
        <WaterLayer
          waterLevelFraction={waterLevelFraction}
          forecastVolatility={forecastVolatility}
          viewW={VIEW_W}
          viewH={VIEW_H}
          onClick={onWaterClick}
        />

        {/* ── Anomaly wave spikes ───────────────────────────────────────── */}
        <AnomalySpikes
          spikes={anomalySpikes}
          waterY={waterY}
          viewW={VIEW_W}
          viewH={VIEW_H}
        />

        {/* ── Icebergs ─────────────────────────────────────────────────── */}
        <IcebergLayer
          icebergs={icebergs}
          waterY={waterY}
          viewW={VIEW_W}
          viewH={VIEW_H}
        />

        {/* ── Iceberg labels (inline for readability) ──────────────────── */}
        {icebergs.map((berg, i) => {
          const spread = VIEW_W * 0.45;
          const startX = VIEW_W * 0.05;
          const bx = icebergs.length === 1
            ? startX + spread * 0.5
            : startX + (i / (icebergs.length - 1)) * spread;

          return (
            <g
              key={`berglabel-${berg.id}`}
              onClick={berg.onClick}
              style={{ cursor: 'pointer' }}
            >
              {/* Annotation box below waterline */}
              <rect
                x={bx - 60}
                y={waterY + 55}
                width={120}
                height={28}
                rx={4}
                fill="rgba(15,23,42,0.75)"
                stroke="rgba(148,163,184,0.2)"
                strokeWidth={0.8}
              />
              <text x={bx} y={waterY + 67} textAnchor="middle" fontSize={7} fontWeight="bold" fill="#e2e8f0" fontFamily="sans-serif">
                {berg.severity === 'high' ? 'Risk' : berg.severity === 'medium' ? 'Anomaly' : 'Alert'}
              </text>
              <text x={bx} y={waterY + 79} textAnchor="middle" fontSize={6.5} fill="#94a3b8" fontFamily="sans-serif">
                {berg.label.length > 20 ? berg.label.slice(0, 20) + '…' : berg.label}
              </text>
            </g>
          );
        })}

        {/* ── Greek Galley ─────────────────────────────────────────────── */}
        <GreekGalley
          cx={shipCX}
          waterY={waterY}
          runwayFraction={runwayFraction}
          captainClass={captainClass}
          onClick={onShipClick}
        />

        {/* ── THESEUS label ─────────────────────────────────────────────── */}
        <g transform={`translate(${shipCX - 50}, ${waterY + 30})`}>
          <text
            fontSize={11}
            fontWeight="bold"
            fill="white"
            fontFamily="serif"
            opacity={0.75}
            textAnchor="middle"
            x={0}
            y={0}
            style={{ letterSpacing: '0.15em' }}
          >
            'THESEUS'
          </text>
          <text
            fontSize={8}
            fill="rgba(255,255,255,0.55)"
            fontFamily="serif"
            textAnchor="middle"
            x={0}
            y={12}
            style={{ letterSpacing: '0.05em' }}
          >
            Greek galley
          </text>
        </g>

        {/* ── Captain speech bubble on react ───────────────────────────── */}
        {captainReacting && (
          <g style={{ animation: 'fadeInOut 1.4s ease forwards' }}>
            <rect
              x={shipCX - 240}
              y={waterY - 130}
              width={180}
              height={38}
              rx={6}
              fill="rgba(15,23,42,0.88)"
              stroke="#22d3ee"
              strokeWidth={0.8}
            />
            <polygon
              points={`
                ${shipCX - 200},${waterY - 92}
                ${shipCX - 185},${waterY - 82}
                ${shipCX - 215},${waterY - 92}
              `}
              fill="rgba(15,23,42,0.88)"
              stroke="#22d3ee"
              strokeWidth={0.8}
            />
            <text x={shipCX - 228} y={waterY - 115} fontSize={7.5} fill="#94a3b8" fontFamily="monospace">
              GEMMA RECOMMENDS
            </text>
            <text x={shipCX - 228} y={waterY - 103} fontSize={8.5} fill="#e2e8f0" fontFamily="monospace">
              {recommendationSummary.length > 24
                ? recommendationSummary.slice(0, 24) + '…'
                : recommendationSummary}
            </text>
          </g>
        )}

        {/* ── Annotation callouts ───────────────────────────────────────── */}
        <ShipAnnotations annotations={annotations} />
      </svg>
    </div>
  );
}
