import React from 'react';

interface Props {
  /** SVG x coordinate of ship center */
  cx: number;
  /** SVG y coordinate of the waterline */
  waterY: number;
  /** 0–1: 1 = healthy runway (ship high), 0 = critical (ship low/tilted) */
  runwayFraction: number;
  /** CSS class for captain animation trigger */
  captainClass?: string;
  /** Click handler wired to runway metric */
  onClick?: () => void;
}

/**
 * GreekGalley
 * ────────────
 * Monument Valley-style flat-shaded ancient Greek war galley (trireme).
 *
 * Elements (back → front):
 *  • Oars (extended port-side rows)
 *  • Hull — long trapezoidal body with curved keel
 *  • Ram (rostrum) at the bow
 *  • Aft castle / stern ornament
 *  • Main mast + square sail
 *  • Captain figure at the stern steering oar
 *  • Eye of the ship (traditional Greek eye on the bow)
 *
 * runwayFraction drives:
 *  - Vertical offset (low = ship sits lower toward waterline)
 *  - Slight clockwise tilt (max ~8°) when runway is critical
 */
export default function GreekGalley({
  cx,
  waterY,
  runwayFraction,
  captainClass = '',
  onClick,
}: Props) {
  // Draft: how far above waterline the keel rides
  // healthy = 14px above, critical = 2px (nearly submerged)
  const draftPx = 2 + runwayFraction * 12;
  const tiltDeg = (1 - runwayFraction) * 8;

  // Key vertical anchors
  const keelY = waterY - draftPx;
  const hullH = 52;
  const hullTop = keelY - hullH;
  const hullW = 310;

  // Hull shape — long keel, raised bow and stern
  const hullPath = [
    `M ${cx - hullW * 0.5} ${hullTop + 12}`,       // stern top-left
    `Q ${cx - hullW * 0.5} ${hullTop} ${cx - hullW * 0.4} ${hullTop - 6}`, // stern curve up
    `L ${cx + hullW * 0.38} ${hullTop - 4}`,         // bow top
    `Q ${cx + hullW * 0.52} ${hullTop - 2} ${cx + hullW * 0.55} ${hullTop + 10}`, // bow nose
    `L ${cx + hullW * 0.45} ${keelY}`,               // bow keel
    `L ${cx - hullW * 0.42} ${keelY}`,               // stern keel
    `Q ${cx - hullW * 0.5} ${keelY} ${cx - hullW * 0.5} ${hullTop + 12}`, // stern close
    'Z',
  ].join(' ');

  // Ram (rostrum) — pointed prow extension below waterline
  const ramPath = [
    `M ${cx + hullW * 0.45} ${keelY}`,
    `L ${cx + hullW * 0.62} ${keelY + 8}`,
    `L ${cx + hullW * 0.45} ${keelY + 6}`,
    'Z',
  ].join(' ');

  // Deck planking line
  const deckY = hullTop + 6;

  // Oar positions — 8 oars per side, extending below waterline
  const oarCount = 8;
  const oarStartX = cx - hullW * 0.36;
  const oarSpacing = (hullW * 0.68) / (oarCount - 1);

  // Mast position — slightly aft of centre
  const mastX = cx - 20;
  const mastBase = hullTop - 2;
  const mastTop = mastBase - 140;

  // Sail shape — square/rectangular ancient Greek sail
  const sailPath = [
    `M ${mastX - 80} ${mastTop + 18}`,
    `L ${mastX + 80} ${mastTop + 18}`,
    `L ${mastX + 72} ${mastBase - 8}`,
    `L ${mastX - 72} ${mastBase - 8}`,
    'Z',
  ].join(' ');

  return (
    <g
      transform={`rotate(${tiltDeg}, ${cx}, ${keelY})`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      role={onClick ? 'button' : undefined}
      aria-label="Ship — click to view runway metric"
    >
      <defs>
        <linearGradient id="galleryHullGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B7355" />
          <stop offset="50%" stopColor="#6B5B3E" />
          <stop offset="100%" stopColor="#4A3728" />
        </linearGradient>
        <linearGradient id="gallerySailGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5E6C8" stopOpacity="0.97" />
          <stop offset="100%" stopColor="#D4C4A0" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="galleryDeckGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A0856A" />
          <stop offset="100%" stopColor="#7A6350" />
        </linearGradient>
      </defs>

      {/* ── Oars (below waterline, port side) ───────────────────────────── */}
      {Array.from({ length: oarCount }).map((_, i) => {
        const oarX = oarStartX + i * oarSpacing;
        const oarAngle = -25 + i * 3; // slight fan pattern
        const radian = (oarAngle * Math.PI) / 180;
        const oarLen = 38;
        return (
          <line
            key={`oar-${i}`}
            x1={oarX}
            y1={deckY + 10}
            x2={oarX + Math.sin(radian) * oarLen}
            y2={deckY + 10 + Math.cos(radian) * oarLen}
            stroke="#5C4A35"
            strokeWidth={2.5}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}

      {/* ── Oar blades (paddle ends) ────────────────────────────────────── */}
      {Array.from({ length: oarCount }).map((_, i) => {
        const oarX = oarStartX + i * oarSpacing;
        const oarAngle = -25 + i * 3;
        const radian = (oarAngle * Math.PI) / 180;
        const oarLen = 38;
        return (
          <ellipse
            key={`blade-${i}`}
            cx={oarX + Math.sin(radian) * oarLen}
            cy={deckY + 10 + Math.cos(radian) * oarLen}
            rx={4}
            ry={7}
            fill="#4A3728"
            opacity={0.8}
          />
        );
      })}

      {/* ── Ram (rostrum) ────────────────────────────────────────────────── */}
      <path d={ramPath} fill="#4A3728" opacity={0.9} />
      {/* Ram bronze tip */}
      <ellipse
        cx={cx + hullW * 0.62}
        cy={keelY + 4}
        rx={5}
        ry={3}
        fill="#B8860B"
        opacity={0.9}
      />

      {/* ── Main hull ─────────────────────────────────────────────────────── */}
      <path d={hullPath} fill="url(#galleryHullGrad)" />

      {/* Hull strake lines (planking detail) */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <line
          key={`strake-${i}`}
          x1={cx - hullW * 0.48}
          y1={hullTop + hullH * f}
          x2={cx + hullW * 0.44}
          y2={hullTop + hullH * f - 3}
          stroke="#3D2B1F"
          strokeWidth={0.8}
          opacity={0.4}
        />
      ))}

      {/* ── Deck ────────────────────────────────────────────────────────── */}
      <rect
        x={cx - hullW * 0.46}
        y={deckY}
        width={hullW * 0.86}
        height={10}
        rx={2}
        fill="url(#galleryDeckGrad)"
      />

      {/* ── Deck railing posts ───────────────────────────────────────────── */}
      {Array.from({ length: 12 }).map((_, i) => {
        const px = cx - hullW * 0.44 + i * (hullW * 0.84 / 11);
        return (
          <line
            key={`railing-${i}`}
            x1={px}
            y1={deckY}
            x2={px}
            y2={deckY - 8}
            stroke="#8B6914"
            strokeWidth={2}
            opacity={0.7}
          />
        );
      })}
      {/* Top rail */}
      <line
        x1={cx - hullW * 0.44}
        y1={deckY - 8}
        x2={cx + hullW * 0.42}
        y2={deckY - 8}
        stroke="#8B6914"
        strokeWidth={1.5}
        opacity={0.6}
      />

      {/* ── Stern ornament / acrostolion ────────────────────────────────── */}
      <path
        d={`M ${cx - hullW * 0.5} ${hullTop - 6} Q ${cx - hullW * 0.52} ${hullTop - 22} ${cx - hullW * 0.48} ${hullTop - 28}`}
        fill="none"
        stroke="#8B6914"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={cx - hullW * 0.48} cy={hullTop - 28} r={4} fill="#B8860B" />

      {/* ── Mast ────────────────────────────────────────────────────────── */}
      <line
        x1={mastX}
        y1={mastTop}
        x2={mastX}
        y2={mastBase}
        stroke="#6B5B3E"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Yard arm (horizontal spar) */}
      <line
        x1={mastX - 82}
        y1={mastTop + 18}
        x2={mastX + 82}
        y2={mastTop + 18}
        stroke="#6B5B3E"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* ── Sail ────────────────────────────────────────────────────────── */}
      <path
        d={sailPath}
        fill="url(#gallerySailGrad)"
        stroke="#C4A882"
        strokeWidth={1.5}
      />

      {/* Sail horizontal ropes/bands */}
      {[0.3, 0.6].map((f, i) => {
        const sy = mastTop + 18 + (mastBase - 8 - (mastTop + 18)) * f;
        const sw = 80 - f * 8;
        return (
          <line
            key={`sailrope-${i}`}
            x1={mastX - sw}
            y1={sy}
            x2={mastX + sw}
            y2={sy}
            stroke="#8B7355"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* Sail diagonal ropes (braces) */}
      <line x1={mastX - 80} y1={mastTop + 18} x2={mastX} y2={mastBase - 8} stroke="#8B7355" strokeWidth={1} opacity={0.4} />
      <line x1={mastX + 80} y1={mastTop + 18} x2={mastX} y2={mastBase - 8} stroke="#8B7355" strokeWidth={1} opacity={0.4} />

      {/* ── Greek decorative pattern on sail ───────────────────────────── */}
      {/* Simple meander/key pattern hint */}
      <rect
        x={mastX - 68}
        y={mastTop + 20}
        width={136}
        height={8}
        fill="none"
        stroke="#8B6914"
        strokeWidth={0.8}
        opacity={0.4}
      />

      {/* ── Ship's eye (traditional) ─────────────────────────────────────── */}
      {/* Large eye painted on bow */}
      <circle
        cx={cx + hullW * 0.38}
        cy={hullTop + 22}
        r={10}
        fill="#F5E6C8"
        stroke="#4A3728"
        strokeWidth={1.5}
      />
      <circle
        cx={cx + hullW * 0.38}
        cy={hullTop + 22}
        r={5}
        fill="#2D5A8C"
      />
      <circle
        cx={cx + hullW * 0.38 + 2}
        cy={hullTop + 20}
        r={2}
        fill="#1A3D5C"
      />
      {/* Eye pupil highlight */}
      <circle
        cx={cx + hullW * 0.39}
        cy={hullTop + 21}
        r={1}
        fill="white"
        opacity={0.7}
      />

      {/* ── Flag / standard on mast ──────────────────────────────────────── */}
      <polygon
        points={`${mastX},${mastTop} ${mastX + 28},${mastTop + 12} ${mastX},${mastTop + 22}`}
        fill="#1A5FA8"
        stroke="#4A90D9"
        strokeWidth={0.5}
        opacity={0.9}
      />
      {/* White cross on flag */}
      <line x1={mastX + 5} y1={mastTop + 5} x2={mastX + 22} y2={mastTop + 16} stroke="white" strokeWidth={1} opacity={0.6} />

      {/* ── Waterline accent stripe ──────────────────────────────────────── */}
      <line
        x1={cx - hullW * 0.42}
        y1={keelY - 1}
        x2={cx + hullW * 0.45}
        y2={keelY - 1}
        stroke="#5BA3C9"
        strokeWidth={2.5}
        opacity={0.5}
      />

      {/* ── Captain / Gemma figure at stern ──────────────────────────────── */}
      <g
        className={captainClass}
        transform={`translate(${cx - hullW * 0.42}, ${deckY - 22})`}
        style={{ transformOrigin: 'center bottom' }}
      >
        {/* Steering oar */}
        <line x1={0} y1={18} x2={-16} y2={38} stroke="#6B5B3E" strokeWidth={3} strokeLinecap="round" />

        {/* Body / tunic */}
        <path
          d="M -8 18 Q -12 32 -10 42 Q 0 44 10 42 Q 12 32 8 18 Z"
          fill="#2D5A8C"
          stroke="#1A3D5C"
          strokeWidth={0.5}
        />
        {/* Tunic hem detail */}
        <path d="M -10 38 Q 0 42 10 38" fill="none" stroke="#4A90D9" strokeWidth={0.8} opacity={0.6} />

        {/* Arm extended to oar */}
        <line x1={-8} y1={24} x2={-18} y2={30} stroke="#D4A574" strokeWidth={3} strokeLinecap="round" />

        {/* Head */}
        <circle cx={0} cy={10} r={9} fill="#D4A574" />

        {/* Helmet */}
        <path d="M -8 8 Q -9 0 0 -3 Q 9 0 8 8 Z" fill="#8B6914" />
        {/* Helmet plume */}
        <path d="M 0 -3 Q 2 -18 5 -22 Q 1 -20 0 -16 Q -1 -20 -5 -22 Q -2 -18 0 -3" fill="#DC143C" opacity={0.8} />

        {/* Face details */}
        <circle cx={-3} cy={11} r={1.2} fill="#2D1F14" />
        <circle cx={3} cy={11} r={1.2} fill="#2D1F14" />
        <path d="M -2 14 Q 0 16 2 14" fill="none" stroke="#8B5E3C" strokeWidth={0.8} />

        {/* Cape / cloak */}
        <path
          d="M -6 18 Q -20 28 -18 42 Q -8 38 0 35"
          fill="#8B0000"
          opacity={0.7}
        />
      </g>
    </g>
  );
}
