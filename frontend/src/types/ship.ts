// ─── Iceberg risk event ────────────────────────────────────────────────────────
export interface Iceberg {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  onClick: () => void;
}

// ─── Financial goal / milestone on the horizon ────────────────────────────────
export interface Island {
  id: string;
  label: string;
  /** 0–1 fraction of viewport width */
  distancePct: number;
  onClick: () => void;
}

// ─── Anomaly wave-spike (duplicate payment, spending spike, etc.) ──────────────
export interface AnomalySpike {
  id: string;
  /** 0–1 fraction of viewport width */
  positionPct: number;
  onClick: () => void;
}

// ─── Root props for ShipView ──────────────────────────────────────────────────
export interface ShipViewProps {
  /** Drives water level (higher cash = higher water for a healthy-looking scene) */
  cashBalance: number;
  /** Max value to normalise cashBalance against viewport */
  maxCashBalance: number;
  /** Drives ship draft: low runway = ship riding low / slightly tilted */
  runwayDays: number;
  /** 0.0 (calm) → 1.0 (choppy): wave amplitude + animation speed */
  forecastVolatility: number;
  /** 0.0 (clear) → 1.0 (storm): storm cloud opacity & density */
  shortfallRisk: number;
  icebergs: Iceberg[];
  islands: Island[];
  anomalySpikes: AnomalySpike[];
  /** Changing this string triggers a captain animation reaction */
  recommendationSummary: string;
}
