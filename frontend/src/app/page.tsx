'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import ShipView from '@/components/ship/ShipView';
import Modal from '@/components/dashboard/Modal';
import { 
  fetchSummary, 
  fetchForecast, 
  fetchRecommendations, 
  fetchReminderDraft 
} from '@/lib/api';

const ORG_ID = 1;

const formatINR = (v: number) => {
  if (v === undefined || v === null || isNaN(v)) return '₹0';
  const val = Math.abs(v);
  const prefix = v < 0 ? '-' : '';
  if (val >= 100000) {
    return `${prefix}₹${(val / 100000).toFixed(2)}L`;
  }
  return `${prefix}₹${Math.round(val / 1000)}K`;
};

export default function HomePage() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [modalType, setModalType] = useState<'water' | 'ship' | 'iceberg' | 'forecast' | null>(null);
  const [activeIceberg, setActiveIceberg] = useState<{ id: string; label: string } | null>(null);
  const [invoiceReminderDraft, setInvoiceReminderDraft] = useState('');
  const [draftingInvoice, setDraftingInvoice] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theseus_lang');
    if (saved) setSelectedLanguage(saved);
  }, []);

  // Poll summary and analytics so visual advances dynamically
  const { data: summary } = useSWR(
    `summary-${ORG_ID}`, 
    () => fetchSummary(ORG_ID), 
    { refreshInterval: 4000 }
  );

  const { data: forecast90 } = useSWR(
    `forecast-90-${ORG_ID}`, 
    () => fetchForecast(ORG_ID, 90), 
    { refreshInterval: 8000 }
  );

  const { data: recommendations } = useSWR(
    `recs-${ORG_ID}`, 
    () => fetchRecommendations(ORG_ID), 
    { refreshInterval: 6000 }
  );

  const handleWaterClick = () => {
    setModalType('water');
  };

  const handleShipClick = () => {
    setModalType('ship');
  };

  const handleWaveClick = () => {
    setModalType('forecast');
  };

  const handleIcebergClick = async (bergId: string, label: string) => {
    setActiveIceberg({ id: bergId, label });
    setModalType('iceberg');
    setInvoiceReminderDraft('');
    setDraftingInvoice(true);

    try {
      // Fetch automated draft email from course of action endpoint for invoice ID 3
      const res = await fetchReminderDraft(3, ORG_ID, selectedLanguage);
      setInvoiceReminderDraft(res.draft);
    } catch (err: any) {
      setInvoiceReminderDraft(`Dear Customer,\n\nThis is a notification that invoice details relating to "${label}" are outstanding. Please clear the pending balance.\n\nBest regards.`);
    } finally {
      setDraftingInvoice(false);
    }
  };

  // Compile icebergs list
  const computedIcebergs = [
    {
      id: 'icb-acme',
      label: 'Customer Acme Overdue',
      severity: 'high' as const,
      onClick: () => handleIcebergClick('icb-acme', 'Customer Acme Overdue'),
    },
    {
      id: 'icb-anomaly',
      label: 'Anomaly: Spend Spike',
      severity: 'medium' as const,
      onClick: () => handleIcebergClick('icb-anomaly', 'Anomaly: Spend Spike'),
    },
  ];

  const computedIslands = [
    {
      id: 'isl-q3',
      label: 'Q3 Revenue Port',
      distancePct: 0.8,
      onClick: () => handleWaterClick(),
    },
  ];

  const computedSpikes = [
    {
      id: 'spike-forecast',
      positionPct: 0.65,
      onClick: handleWaveClick,
    },
  ];

  return (
    <div className="relative w-full h-[calc(100vh-50px)] overflow-hidden bg-slate-900">
      
      {/* HUD Info Overlay Card */}
      <div className="absolute top-4 left-4 z-20 w-80 bg-slate-905/80 backdrop-blur-md border border-slate-800 rounded-xl p-4 space-y-3 pointer-events-auto">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-blue-500 font-bold">Glanceable Financial Helm</span>
          <h2 className="text-sm font-black text-white mt-0.5">THE SHIP OF THESEUS</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Cash Balance</span>
            <span className="font-extrabold text-white text-xs">{formatINR(summary?.cash_balance ?? 435000)}</span>
          </div>
          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Runway Days</span>
            <span className="font-extrabold text-amber-500 text-xs">{summary?.runway_days ?? 75} Days</span>
          </div>
          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Shortfall Risk</span>
            <span className="font-extrabold text-rose-500 text-xs">{Math.round((forecast90?.shortfall_risk ?? 0.15) * 100)}%</span>
          </div>
          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/60">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">Forecast Spread</span>
            <span className="font-extrabold text-indigo-400 text-xs">{Math.round((forecast90?.forecast_confidence_volatility ?? 0.18) * 100)}% Vol</span>
          </div>
        </div>

        <div className="text-[9.5px] leading-relaxed text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-850">
          <strong className="text-blue-400 font-bold block">Course Direction Recommendation:</strong>
          {recommendations?.[0]?.description || 'Runway stable. Clear Acme outstanding invoice.'}
        </div>
      </div>

      {/* Main Full-Screen Ship Canvas */}
      <div className="w-full h-full">
        <ShipView
          cashBalance={summary?.cash_balance ?? 435000}
          maxCashBalance={800000}
          runwayDays={summary?.runway_days ?? 75}
          forecastVolatility={forecast90?.forecast_confidence_volatility ?? 0.18}
          shortfallRisk={forecast90?.shortfall_risk ?? 0.15}
          icebergs={computedIcebergs}
          islands={computedIslands}
          anomalySpikes={computedSpikes}
          recommendationSummary={recommendations?.[0]?.description || 'Runway stable. Clear Acme outstanding invoice.'}
          showAnnotations={true}
          onWaterClick={handleWaterClick}
          onShipClick={handleShipClick}
        />
      </div>

      {/* Interactive Metaphor Drill-Down Modals */}
      
      {/* Water Modal */}
      <Modal
        isOpen={modalType === 'water'}
        onClose={() => setModalType(null)}
        title="Glanceable Metaphor: Water Level (Cash Flow)"
      >
        <div className="space-y-3">
          <p className="font-bold text-slate-800">Metaphor: Water Level = Total Cash Inflow & Outflow</p>
          <p className="text-slate-600">
            A high water level keeps the ship sailing safely above rocky shelves. The depth represents your actual liquid cash balance.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span>Current Cash Balance:</span>
              <span className="font-bold text-blue-600">{formatINR(summary?.cash_balance ?? 435000)}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Monthly Burn:</span>
              <span className="font-bold text-rose-600">{formatINR(summary?.burn_rate ?? 12000)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
              <span>Net Movement:</span>
              <span className="text-emerald-600">{formatINR(summary?.net_cash_flow ?? 45000)}</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Ship/Galley Modal */}
      <Modal
        isOpen={modalType === 'ship'}
        onClose={() => setModalType(null)}
        title="Glanceable Metaphor: Ship Height Above Waterline (Runway)"
      >
        <div className="space-y-3">
          <p className="font-bold text-slate-800">Metaphor: Trireme Draft = Operational Runway</p>
          <p className="text-slate-600">
            A ship loaded heavily riding low in the water or listing represents a critically short cash runway. A light, high galley is agile and safe.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span>Current Liquid Runway:</span>
              <span className="font-bold text-amber-600">{summary?.runway_days ?? 75} Days</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[10px]">
              <span>Ideal Runway Target:</span>
              <span>180 Days</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Forecast Waves Modal */}
      <Modal
        isOpen={modalType === 'forecast'}
        onClose={() => setModalType(null)}
        title="Glanceable Metaphor: Water Turbulence & Waves (Forecast Volatility)"
      >
        <div className="space-y-3">
          <p className="font-bold text-slate-800">Metaphor: Waves = Monte Carlo Forecast Volatility</p>
          <p className="text-slate-600">
            Calm waters represent a stable, highly confident forecast with low variance. Choppy waves reflect a high forecast spread (P90 vs P10 spread) suggesting unpredictable upcoming flows.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex justify-between">
              <span>Forecast Confidence Spread:</span>
              <span className="font-bold text-indigo-600">{Math.round((forecast90?.forecast_confidence_volatility ?? 0.18) * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Simulated Shortfall Probability:</span>
              <span className="font-bold text-rose-500">{Math.round((forecast90?.shortfall_risk ?? 0.15) * 100)}%</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Iceberg Modal */}
      <Modal
        isOpen={modalType === 'iceberg'}
        onClose={() => { setModalType(null); setActiveIceberg(null); }}
        title={`Metaphor Obstacle: ${activeIceberg?.label || 'Iceberg'}`}
      >
        <div className="space-y-3">
          <p className="font-bold text-slate-800">Resolve Outstanding Invoice Debt to Dissolve Iceberg</p>
          <p className="text-slate-650">
            Icebergs represent immediate credit anomalies or outstanding invoices at high risk of payment delay. Draft an instant multilingual reminder:
          </p>
          
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Drafted Email Reminder ({selectedLanguage})</span>
            {draftingInvoice ? (
              <p className="text-[10px] animate-pulse text-blue-600">Generating translation draft...</p>
            ) : (
              <textarea
                value={invoiceReminderDraft}
                onChange={(e) => setInvoiceReminderDraft(e.target.value)}
                className="w-full h-32 bg-white border border-slate-200 rounded p-2 text-[10px] font-mono outline-none focus:border-blue-400 leading-relaxed"
              />
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setModalType(null); setActiveIceberg(null); }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                alert(`Reminder email sent successfully!`);
                setModalType(null);
                setActiveIceberg(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold shadow-sm"
            >
              Send Reminder
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
