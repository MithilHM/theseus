import React from 'react';

interface Props {
  /** Mean water Y coordinate (SVG units, top-down) */
  waterY: number;
  /** 0–1: 1 = healthy runway (ship rides high), 0 = critical (ship rides low/tilts) */
  runwayFraction: number;
  viewW: number;
  viewH: number;
  /** Extra className for captain-reacting animation trigger */
  captainClass?: string;
}

/**
 * ShipBody
 * ────────
 * Flat-shaded, Monument Valley-style 2D ship.
 *
 * Layout (all SVG units):
 *   Hull    — trapezoidal body
 *   Cabin   — superstructure block above hull
 *   Mast    — tall vertical spar with crow's nest
 *   Sails   — two filled triangles
 *   Helm    — steering wheel at stern
 *   Captain — small figure composed in CaptainFigure below
 *
 * runwayFraction drives:
 *   - vertical offset  (low runway → ship drops toward waterline)
 *   - tilt angle (low runway → slight clockwise list, max ~12°)
 */
export default function ShipBody({
  waterY,
  runwayFraction,
  viewW,
  viewH,
  captainClass = '',
}: Props) {
  // Ship is horizontally centred, slight offset left of centre for visual balance
  const shipCX = viewW * 0.45;

  // Runway fraction → draft (how many px above waterline the keel sits)
  // Healthy: keel is 18px above waterline. Critical: keel is 6px (nearly submerged).
  const draftOffsetFromWater = 6 + runwayFraction * 22;
  const tiltDeg = (1 - runwayFraction) * 10; // max 10° clockwise tilt when runway = 0

  // Base ship bottom sits at waterY (surface) minus a small offset so it looks like it's floating
  const shipBottom = waterY - draftOffsetFromWater;

  // ── Dimensions ────────────────────────────────────────────────────────────────
  const hullH = 60;
  const hullW = 220;
  const cabinH = 36;
  const cabinW = 100;
  const mastH = 130;
  const mastX = shipCX - 15; // mast sits slightly aft of centre

  const hullTop = shipBottom - hullH;
  const cabinBottom = hullTop;
  const cabinTop = cabinBottom - cabinH;
  const mastTop = cabinTop - mastH;

  // Hull trapezoid points (wider at top, narrower at bottom keel)
  const hullPoints = [
    [shipCX - hullW / 2, hullTop],   // top-left
    [shipCX + hullW / 2, hullTop],   // top-right
    [shipCX + hullW * 0.36, shipBottom], // keel-right
    [shipCX - hullW * 0.36, shipBottom], // keel-left
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  // Bow pointed nose
  const bowPoints = [
    [shipCX + hullW / 2, hullTop],
    [shipCX + hullW * 0.36, shipBottom],
    [shipCX + hullW * 0.62, hullTop + hullH * 0.55],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  return (
    <g
      transform={`rotate(${tiltDeg}, ${shipCX}, ${shipBottom})`}
      className={`ship-body ${captainClass}`}
      style={{ transition: 'transform 1s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      <defs>
        <linearGradient id="hullGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
        <linearGradient id="sailGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.97" />
          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="cabinGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>

      {/* ── Water-line accent stripe ─────────────────────────────────── */}
      <line
        x1={shipCX - hullW * 0.36}
        y1={shipBottom - 2}
        x2={shipCX + hullW * 0.36}
        y2={shipBottom - 2}
        stroke="#0ea5e9"
        strokeWidth={3}
        opacity={0.6}
      />

      {/* ── Hull ──────────────────────────────────────────────────────── */}
      <polygon points={hullPoints} fill="url(#hullGrad)" />

      {/* Bow nose extension */}
      <polygon points={bowPoints} fill="#1f2937" />

      {/* Hull shadow line */}
      <line
        x1={shipCX - hullW / 2}
        y1={hullTop + 4}
        x2={shipCX + hullW / 2}
        y2={hullTop + 4}
        stroke="#0ea5e9"
        strokeWidth={1.5}
        opacity={0.35}
      />

      {/* ── Cabin / Superstructure ────────────────────────────────────── */}
      <rect
        x={shipCX - cabinW / 2}
        y={cabinTop}
        width={cabinW}
        height={cabinH}
        rx={4}
        fill="url(#cabinGrad)"
      />
      {/* Porthole windows */}
      {[-28, 0, 28].map((dx) => (
        <circle
          key={dx}
          cx={shipCX + dx}
          cy={cabinTop + cabinH / 2}
          r={5}
          fill="#0ea5e9"
          opacity={0.7}
        />
      ))}

      {/* ── Mast ──────────────────────────────────────────────────────── */}
      <line
        x1={mastX}
        y1={mastTop}
        x2={mastX}
        y2={cabinTop}
        stroke="#6b7280"
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Crow's nest */}
      <rect
        x={mastX - 10}
        y={mastTop - 2}
        width={20}
        height={12}
        rx={2}
        fill="#374151"
        stroke="#4b5563"
        strokeWidth={1}
      />

      {/* ── Main sail ─────────────────────────────────────────────────── */}
      <polygon
        points={`
          ${mastX},${mastTop + 8}
          ${mastX},${cabinTop - 10}
          ${mastX - 70},${cabinTop - 10}
        `}
        fill="url(#sailGrad)"
        stroke="#e2e8f0"
        strokeWidth={1}
        opacity={0.92}
      />
      {/* Top-sail */}
      <polygon
        points={`
          ${mastX},${mastTop - 2}
          ${mastX},${mastTop + 40}
          ${mastX - 38},${mastTop + 40}
        `}
        fill="url(#sailGrad)"
        stroke="#e2e8f0"
        strokeWidth={0.8}
        opacity={0.8}
      />

      {/* ── Flag ──────────────────────────────────────────────────────── */}
      <polygon
        points={`${mastX},${mastTop - 2} ${mastX + 22},${mastTop + 8} ${mastX},${mastTop + 18}`}
        fill="#06b6d4"
        opacity={0.9}
      />

      {/* ── Helm / Steering Wheel ─────────────────────────────────────── */}
      {/* Positioned at stern (right of cabin) */}
      <g transform={`translate(${shipCX + cabinW / 2 + 18}, ${cabinTop + 8})`}>
        {/* Wheel rim */}
        <circle r={12} fill="none" stroke="#92400e" strokeWidth={3} />
        {/* Spokes */}
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1={0}
            y1={0}
            x2={12 * Math.cos((deg * Math.PI) / 180)}
            y2={12 * Math.sin((deg * Math.PI) / 180)}
            stroke="#92400e"
            strokeWidth={2}
          />
        ))}
        {/* Wheel hub */}
        <circle r={3} fill="#78350f" />
      </g>

      {/* ── Captain figure ────────────────────────────────────────────── */}
      {/* Simple silhouette: hat + head + body at helm position */}
      <g
        transform={`translate(${shipCX + cabinW / 2 + 18}, ${cabinTop - 5})`}
        className={captainClass}
      >
        {/* Hat */}
        <rect x={-8} y={-24} width={16} height={5} rx={1} fill="#1e293b" />
        <rect x={-5} y={-32} width={10} height={9} rx={2} fill="#0f172a" />
        {/* Head */}
        <circle cy={-14} r={6} fill="#fbbf24" />
        {/* Body */}
        <rect x={-5} y={-8} width={10} height={14} rx={2} fill="#1d4ed8" />
        {/* Arm reaching toward wheel */}
        <line
          x1={-5}
          y1={-4}
          x2={-14}
          y2={2}
          stroke="#fbbf24"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
