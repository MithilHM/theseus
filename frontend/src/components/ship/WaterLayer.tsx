import React from 'react';

interface Props {
  /** 0–1 normalised position: 0 = bottom, 1 = top of viewport */
  waterLevelFraction: number;
  /** 0–1: 0 = flat, 1 = very choppy */
  forecastVolatility: number;
  viewW: number;
  viewH: number;
  onClick?: () => void;
}

/**
 * WaterLayer
 * ──────────
 * Renders a sine-wave ocean surface as a filled SVG <path>.
 * - waterLevelFraction positions the mean water line vertically.
 * - forecastVolatility drives amplitude; wave phase scrolls via CSS animation.
 * - Two overlapping wave paths give depth (darker underneath, lighter on top).
 */
export default function WaterLayer({
  waterLevelFraction,
  forecastVolatility,
  viewW,
  viewH,
  onClick,
}: Props) {
  // Water surface sits in the lower portion of the viewport.
  // 0 fraction → waterline near bottom; 1 fraction → waterline near top.
  // We clamp to [0.25, 0.75] so it stays visually reasonable.
  const clampedLevel = Math.max(0.25, Math.min(0.75, waterLevelFraction));
  const waterY = viewH * (1 - clampedLevel); // SVG Y is top-down

  // Wave amplitude: calm ≈ 4px, choppy ≈ 30px
  const amplitude = 4 + forecastVolatility * 26;
  // Wavelength stays fixed; phase scroll speed is tied to volatility
  const waveLen = viewW * 0.35;

  // Build a sine-wave path across the full width, then close to the bottom.
  const buildWavePath = (phase: number, amp: number): string => {
    const steps = 60;
    const dx = viewW / steps;
    let d = `M 0 ${waterY}`;
    for (let i = 0; i <= steps; i++) {
      const x = i * dx;
      const y = waterY + Math.sin(((x + phase) / waveLen) * Math.PI * 2) * amp;
      d += ` L ${x} ${y}`;
    }
    d += ` L ${viewW} ${viewH} L 0 ${viewH} Z`;
    return d;
  };

  // Primary wave (lighter, on top) — phase offset 0
  // Secondary wave (darker, slightly below) — phase offset quarter-wave
  const primaryPath = buildWavePath(0, amplitude);
  const shadowPath = buildWavePath(waveLen * 0.25, amplitude * 0.7);

  // Animation duration: calm = 8s, choppy = 2.5s
  const animDuration = 8 - forecastVolatility * 5.5;

  return (
    <g
      className="water-layer"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Shadow/depth wave */}
      <path
        d={shadowPath}
        fill="url(#waterDeep)"
        opacity={0.85}
        style={{
          animation: `waveScroll ${animDuration * 1.3}s linear infinite`,
        }}
      />
      {/* Primary surface wave */}
      <path
        d={primaryPath}
        fill="url(#waterSurface)"
        style={{
          animation: `waveScroll ${animDuration}s linear infinite`,
        }}
      />

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="waterSurface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#0369a1" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waterDeep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#075985" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#082f49" stopOpacity="1" />
        </linearGradient>
      </defs>
    </g>
  );
}
