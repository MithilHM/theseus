import React from 'react';

interface Props {
  cx: number;
  waterY: number;
  runwayFraction: number;
  captainClass?: string;
  onClick?: () => void;
}

export default function GreekGalley({
  cx,
  waterY,
  runwayFraction,
  captainClass = '',
  onClick,
}: Props) {
  const draftPx = 2 + runwayFraction * 12;
  const tiltDeg = 0;

  const keelY = waterY - draftPx;
  const hullH = 40;
  const hullTop = keelY - hullH;
  const hullW = 280;

  // Colors based on reference image
  const hullWood = "#D6C7A1";
  const hullOutline = "#3E4C59";
  const trimBlue = "#427C9B";
  const gold = "#F4D03F";
  const oarWood = "#C49C71";
  const sailBlue = "#4489B9";
  const sailStripe = "#7ABBE0";
  const mastWood = "#D4AC82";
  const shieldGrey = "#A6B7BD";
  const shieldRim = "#7D929A";

  // Curving stern and bow
  const hullPath = [
    `M ${cx - hullW * 0.45} ${hullTop - 30}`, // Stern tip (high up)
    `C ${cx - hullW * 0.52} ${hullTop - 10}, ${cx - hullW * 0.45} ${hullTop + 5}, ${cx - hullW * 0.38} ${hullTop + 5}`, // Curve down
    `L ${cx + hullW * 0.38} ${hullTop + 5}`, // Straight deck
    `C ${cx + hullW * 0.52} ${hullTop + 5}, ${cx + hullW * 0.58} ${hullTop - 10}, ${cx + hullW * 0.52} ${hullTop - 30}`, // Bow tip (high up)
    `C ${cx + hullW * 0.6} ${hullTop + 10}, ${cx + hullW * 0.45} ${keelY}, ${cx + hullW * 0.3} ${keelY}`, // Bow curve to keel
    `L ${cx - hullW * 0.25} ${keelY}`, // Keel bottom
    `C ${cx - hullW * 0.45} ${keelY}, ${cx - hullW * 0.55} ${hullTop + 10}, ${cx - hullW * 0.45} ${hullTop - 30}`, // Stern curve to keel
    'Z',
  ].join(' ');

  const trimPath = [
    `M ${cx - hullW * 0.45} ${hullTop - 30}`,
    `C ${cx - hullW * 0.52} ${hullTop - 10}, ${cx - hullW * 0.45} ${hullTop + 5}, ${cx - hullW * 0.38} ${hullTop + 5}`,
    `L ${cx + hullW * 0.38} ${hullTop + 5}`,
    `C ${cx + hullW * 0.52} ${hullTop + 5}, ${cx + hullW * 0.58} ${hullTop - 10}, ${cx + hullW * 0.52} ${hullTop - 30}`,
    `L ${cx + hullW * 0.5} ${hullTop - 25}`, // Inner curve down
    `C ${cx + hullW * 0.55} ${hullTop - 5}, ${cx + hullW * 0.5} ${hullTop + 12}, ${cx + hullW * 0.38} ${hullTop + 12}`,
    `L ${cx - hullW * 0.38} ${hullTop + 12}`,
    `C ${cx - hullW * 0.45} ${hullTop + 12}, ${cx - hullW * 0.48} ${hullTop - 5}, ${cx - hullW * 0.43} ${hullTop - 25}`,
    'Z'
  ].join(' ');

  const deckY = hullTop + 8;
  const oarCount = 9;
  const oarStartX = cx - hullW * 0.3;
  const oarSpacing = (hullW * 0.55) / (oarCount - 1);

  const mastX = cx - 10;
  const mastBase = hullTop + 5;
  const mastTop = mastBase - 120;

  const sailPath = [
    `M ${mastX - 60} ${mastTop + 15}`,
    `C ${mastX - 40} ${mastTop + 30}, ${mastX + 40} ${mastTop + 30}, ${mastX + 70} ${mastTop + 10}`,
    `C ${mastX + 80} ${mastBase - 30}, ${mastX + 60} ${mastBase - 15}, ${mastX + 40} ${mastBase - 10}`,
    `L ${mastX - 60} ${mastBase - 25}`,
    `C ${mastX - 80} ${mastTop + 40}, ${mastX - 70} ${mastTop + 20}, ${mastX - 60} ${mastTop + 15}`,
    'Z',
  ].join(' ');

  return (
    <g
      transform={`rotate(${tiltDeg}, ${cx}, ${keelY})`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      {/* ── Oars (Background layer) ── */}
      {Array.from({ length: oarCount }).map((_, i) => {
        const oarX = oarStartX + i * oarSpacing;
        const oarAngle = -25 + i * 2; 
        const radian = (oarAngle * Math.PI) / 180;
        const oarLen = 45;
        return (
          <g key={`oar-${i}`}>
            <line
              x1={oarX} y1={deckY + 5}
              x2={oarX + Math.sin(radian) * oarLen} y2={deckY + 5 + Math.cos(radian) * oarLen}
              stroke={oarWood} strokeWidth={3} strokeLinecap="round"
            />
          </g>
        );
      })}

      {/* ── Main hull ── */}
      <path d={hullPath} fill={hullWood} stroke={hullOutline} strokeWidth={1.5} />
      
      {/* ── Blue Trim ── */}
      <path d={trimPath} fill={trimBlue} stroke={hullOutline} strokeWidth={1} />
      
      {/* ── Gold Ornaments ── */}
      <circle cx={cx - hullW * 0.45} cy={hullTop - 30} r={4} fill={gold} stroke={hullOutline} strokeWidth={1} />
      <circle cx={cx + hullW * 0.52} cy={hullTop - 30} r={4} fill={gold} stroke={hullOutline} strokeWidth={1} />

      {/* ── Shields on the side ── */}
      {Array.from({ length: oarCount }).map((_, i) => {
        const oarX = oarStartX + i * oarSpacing;
        return (
          <g key={`shield-${i}`}>
            <circle cx={oarX} cy={deckY} r={7} fill={shieldGrey} stroke={shieldRim} strokeWidth={2} />
            <circle cx={oarX} cy={deckY} r={2} fill={hullOutline} />
          </g>
        );
      })}

      {/* ── Mast ── */}
      <line x1={mastX} y1={mastTop} x2={mastX} y2={mastBase} stroke={mastWood} strokeWidth={6} strokeLinecap="round" />
      <line x1={mastX - 65} y1={mastTop + 18} x2={mastX + 70} y2={mastTop + 14} stroke={mastWood} strokeWidth={4} strokeLinecap="round" />

      {/* ── Sail ── */}
      <path d={sailPath} fill={sailBlue} stroke={hullOutline} strokeWidth={1.5} />
      <path d={sailPath} fill="none" stroke={sailStripe} strokeWidth={4} opacity={0.6} transform="translate(10, 0)" />
      <path d={sailPath} fill="none" stroke={sailStripe} strokeWidth={4} opacity={0.6} transform="translate(-10, 0)" />
      
      {/* ── Ship's eye ── */}
      <path d={`M ${cx + hullW * 0.40} ${hullTop + 15} Q ${cx + hullW * 0.44} ${hullTop + 10} ${cx + hullW * 0.48} ${hullTop + 15} Q ${cx + hullW * 0.44} ${hullTop + 20} ${cx + hullW * 0.40} ${hullTop + 15}`} fill="#FFF" stroke={hullOutline} strokeWidth={1} />
      <circle cx={cx + hullW * 0.44} cy={hullTop + 15} r={2.5} fill="#000" />

      {/* ── Flag ── */}
      <polygon
        points={`${mastX},${mastTop} ${mastX + 25},${mastTop + 5} ${mastX},${mastTop + 15}`}
        fill="#E74C3C" stroke="#C0392B" strokeWidth={1}
      />

      {/* ── Gemma Captain ── */}
      <g
        className={captainClass}
        transform={`translate(${cx - hullW * 0.36}, ${deckY - 35})`}
        style={{ transformOrigin: 'center bottom' }}
      >
        <rect x={-4} y={15} width={8} height={20} fill="#85C1E9" /> {/* Dress */}
        <circle cx={0} cy={10} r={5} fill="#FDE68A" /> {/* Head */}
        <path d="M -6 6 Q -8 15 -6 20 Q 0 10 6 6 Q 4 2 -2 2 Z" fill="#2C3E50" /> {/* Hair */}
        
        {/* Steering wheel base */}
        <line x1={15} y1={20} x2={15} y2={35} stroke={mastWood} strokeWidth={3} />
        <circle cx={15} cy={15} r={7} fill="none" stroke={mastWood} strokeWidth={2} />
        <line x1={15} y1={8} x2={15} y2={22} stroke={mastWood} strokeWidth={1.5} />
        <line x1={8} y1={15} x2={22} y2={15} stroke={mastWood} strokeWidth={1.5} />
        {/* Arms holding wheel */}
        <line x1={2} y1={15} x2={10} y2={15} stroke="#FDE68A" strokeWidth={2} />
      </g>
    </g>
  );
}
