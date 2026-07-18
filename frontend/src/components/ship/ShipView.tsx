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

// ── JS/TS Custom Interpolator Hook for Smooth Prop Animation ────────────────
function useAnimatedValue(target: number, duration: number = 800) {
  const [current, setCurrent] = useState(target);

  useEffect(() => {
    let start: number | null = null;
    const initial = current;
    let animId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = progress * (2 - progress); // Quad ease-out
      setCurrent(initial + (target - initial) * ease);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [target, duration]);

  return current;
}

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
  /** Initial loading skeleton state toggle */
  loading?: boolean;
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
  loading = false,
}: ExtendedShipViewProps) {
  // ── SKELETON LOADER STATE ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
        <svg viewBox="0 0 900 500" width="100%" height="100%" className="skeleton-loader opacity-65">
          {/* Skeleton Sky */}
          <rect x={0} y={0} width={900} height={500} fill="#1e293b" opacity={0.3} />
          {/* Skeleton Clouds */}
          <circle cx={100} cy={100} r={40} fill="#334155" opacity={0.4} className="animate-pulse" />
          <circle cx={160} cy={110} r={50} fill="#334155" opacity={0.4} className="animate-pulse" />
          {/* Skeleton Ship Outline */}
          <rect x={350} y={200} width={200} height={40} rx={10} fill="#334155" opacity={0.5} className="animate-pulse" />
          <rect x={420} y={120} width={60} height={80} fill="#334155" opacity={0.4} className="animate-pulse" />
          {/* Skeleton Water */}
          <rect x={0} y={260} width={900} height={240} fill="#0ea5e9" opacity={0.15} className="animate-pulse" />
          {/* Annotation lines skeletons */}
          <rect x={40} y={40} width={120} height={16} rx={4} fill="#334155" opacity={0.5} />
          <rect x={740} y={40} width={120} height={16} rx={4} fill="#334155" opacity={0.5} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">Aligning Greek Trireme...</span>
        </div>
      </div>
    );
  }

  // ── Smooth interpolation for variables ──────────────────────────────────
  const smoothCash = useAnimatedValue(cashBalance, 800);
  const smoothRunway = useAnimatedValue(runwayDays, 800);
  const smoothVolatility = useAnimatedValue(forecastVolatility, 800);
  const smoothRisk = useAnimatedValue(shortfallRisk, 800);

  // ── Derived values using animated inputs ──────────────────────────────────
  const waterLevelFraction = Math.min(1, Math.max(0, smoothCash / maxCashBalance));
  const runwayFraction = Math.min(1, smoothRunway / MAX_RUNWAY_DAYS);

  const clampedLevel = Math.max(0.3, Math.min(0.7, waterLevelFraction));
  const waterY = VIEW_H * (1 - clampedLevel); // e.g. 0.58 → waterY = 290

  // Ship centre position
  const shipCX = VIEW_W * 0.48;

  // ── Water Sync Ripple detection ───────────────────────────────────────────
  const [rippleActive, setRippleActive] = useState(false);
  const prevCashRef = useRef(cashBalance);

  useEffect(() => {
    if (prevCashRef.current !== cashBalance && prevCashRef.current !== 0) {
      setRippleActive(true);
      const timer = setTimeout(() => setRippleActive(false), 1200);
      prevCashRef.current = cashBalance;
      return () => clearTimeout(timer);
    }
    prevCashRef.current = cashBalance;
  }, [cashBalance]);

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
            <stop offset="0%" stopColor="#E9F2F9" />
            <stop offset="100%" stopColor="#C9DCE8" />
          </linearGradient>

          {/* Soft drop shadow for cards */}
          <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.08" />
          </filter>

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
        <g className={rippleActive ? 'ripple-active' : ''}>
          <WaterLayer
            waterLevelFraction={waterLevelFraction}
            forecastVolatility={forecastVolatility}
            viewW={VIEW_W}
            viewH={VIEW_H}
            onClick={onWaterClick}
          />
        </g>

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
                y={waterY + 50}
                width={120}
                height={32}
                rx={4}
                fill={berg.severity === 'high' ? '#FEF2F2' : '#F8FAFC'}
                stroke={berg.severity === 'high' ? '#FEE2E2' : '#F1F5F9'}
                strokeWidth={1}
                filter="url(#card-shadow)"
              />
              <text x={bx - 50} y={waterY + 64} textAnchor="start" fontSize={9} fontWeight="bold" fill={berg.severity === 'high' ? '#991B1B' : '#000'} fontFamily="sans-serif">
                {berg.severity === 'high' ? 'Risk' : berg.severity === 'medium' ? 'Anomaly' : 'Alert'}
              </text>
              <text x={bx - 50} y={waterY + 76} textAnchor="start" fontSize={8} fill="#334155" fontFamily="sans-serif">
                {berg.label.length > 30 ? berg.label.slice(0, 30) + '…' : berg.label}
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
        <g transform={`translate(${shipCX - 20}, ${waterY + 35})`}>
          <text
            fontSize={12}
            fontWeight="bold"
            fill="#1E293B"
            fontFamily="serif"
            textAnchor="middle"
            x={0}
            y={0}
            style={{ letterSpacing: '0.1em' }}
          >
            &apos;THESEUS&apos;
          </text>
          <text
            fontSize={10}
            fill="#334155"
            fontFamily="serif"
            textAnchor="middle"
            x={0}
            y={12}
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
              height={40}
              rx={6}
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth={1}
              filter="url(#card-shadow)"
            />
            <polygon
              points={`
                ${shipCX - 200},${waterY - 90}
                ${shipCX - 185},${waterY - 80}
                ${shipCX - 215},${waterY - 90}
              `}
              fill="#FFFFFF"
              stroke="#E2E8F0"
              strokeWidth={1}
            />
            <text x={shipCX - 228} y={waterY - 114} fontSize={8} fontWeight="bold" fill="#1E293B" fontFamily="'Inter', sans-serif">
              Gemma Recommends
            </text>
            <text x={shipCX - 228} y={waterY - 102} fontSize={7} fill="#475569" fontFamily="'Inter', sans-serif">
              {recommendationSummary.length > 30
                ? recommendationSummary.slice(0, 30) + '…'
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
