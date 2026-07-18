import { ShipViewProps } from '@/types/ship';

/**
 * Mock ship data — INR values matching the PRD reference image.
 * cashBalance in paise-equiv integer: 435000 = ₹4,35,000
 */
export const mockShipData: ShipViewProps = {
  cashBalance: 435_000,     // ₹4,35,000 → displayed as ₹4.35L
  maxCashBalance: 800_000,  // normalises water level
  runwayDays: 75,           // 75 days runway

  forecastVolatility: 0.18, // narrow band — calm water

  shortfallRisk: 0.15,      // LOW (15%) — faint storm clouds

  icebergs: [
    {
      id: 'icb-acme',
      label: 'Customer Acme Overdue',
      severity: 'high',
      onClick: () => console.log('Clicked: Acme overdue iceberg'),
    },
    {
      id: 'icb-anomaly',
      label: 'Anomaly: Unusual Spend',
      severity: 'medium',
      onClick: () => console.log('Clicked: Unusual spend anomaly'),
    },
  ],

  islands: [
    {
      id: 'isl-q3',
      label: 'Q3 Revenue Target',
      distancePct: 0.78,
      onClick: () => console.log('Clicked: Q3 target island'),
    },
  ],

  anomalySpikes: [
    {
      id: 'spike-spend',
      positionPct: 0.65,
      onClick: () => console.log('Clicked: Unusual spend spike'),
    },
  ],

  recommendationSummary: 'Follow up Acme invoice. Verify GST.',
};

