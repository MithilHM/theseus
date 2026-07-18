'use client';

import React, { useState } from 'react';
import ShipView from '@/components/ship/ShipView';
import AIChat from '@/components/dashboard/AIChat';
import DataIngestion from '@/components/dashboard/DataIngestion';
import { mockShipData } from '@/lib/mockShipData';

// Recharts for inline charts in the right panel
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

// ── INR mock data for the right panel ──────────────────────────────────────────
const cashFlowData = [
  { month: 'Jan', inflow: 38000, outflow: 32000, net: 6000, forecast: null },
  { month: 'Feb', inflow: 42000, outflow: 36000, net: 6000, forecast: null },
  { month: 'Mar', inflow: 40000, outflow: 34000, net: 6000, forecast: null },
  { month: 'Apr', inflow: 48000, outflow: 39000, net: 9000, forecast: null },
  { month: 'May', inflow: 45000, outflow: 40000, net: 5000, forecast: 45000 },
  { month: 'June', inflow: 50000, outflow: 42000, net: 8000, forecast: 48000 },
];

const forecastData = [
  { label: 'Days', p10: 380000, p50: 410000, p90: 440000 },
  { label: 'Days', p10: 370000, p50: 415000, p90: 460000 },
  { label: 'Days', p10: 355000, p50: 425000, p90: 495000 },
  { label: 'Days', p10: 340000, p50: 430000, p90: 525000 },
  { label: 'Days', p10: 325000, p50: 435000, p90: 555000 },
];

const formatINR = (v: number) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(2)}L`
    : `₹${Math.round(v / 1000)}K`;

// Custom tooltip styles for the charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] shadow-lg">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatINR(p.value)}</p>
      ))}
    </div>
  );
};

/**
 * Home Page — Split Screen (Ship View + Dashboard Panel)
 * ────────────────────────────────────────────────────────
 * Left 50%: ShipView (Greek galley visualization with annotations)
 * Right 50%: Dashboard components panel:
 *   - Header with "Dashboard Components" + Data Ingestion popup
 *   - Cash Flow Trend chart
 *   - Cash Forecast (P10/P50/P90) chart
 *   - KPI cards sidebar (Current Balance, Net Cash Flow, Burn Rate, Runway)
 *   - AI Insights (High/Medium/Low recommendations)
 *   - AI Chat with Gemma panel
 */
export default function HomePage() {
  const [showDataIngestion, setShowDataIngestion] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handleWaterClick = () => setActiveSection('cashflow');
  const handleShipClick = () => setActiveSection('kpi');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f1f5f9] font-sans">

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANEL — Ship Visualization
      ════════════════════════════════════════════════════════════════════ */}
      <div className="w-1/2 h-full relative flex flex-col">
        {/* Title bar */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-3 pb-1">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Signature Visualization</p>
          <p className="text-[10px] text-slate-400">
            Animated · 2D vector · 'THESEUS' Greek galley, Monument Valley
          </p>
        </div>

        {/* Ship canvas — fills the entire left half */}
        <div className="flex-1 relative overflow-hidden">
          <ShipView
            {...mockShipData}
            showAnnotations={true}
            onWaterClick={handleWaterClick}
            onShipClick={handleShipClick}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANEL — Dashboard Components
      ════════════════════════════════════════════════════════════════════ */}
      <div className="w-1/2 h-full flex flex-col bg-white border-l border-slate-200 overflow-hidden">

        {/* ── Right panel header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0 relative">
          <h2 className="text-sm font-bold text-slate-800">Dashboard Components</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDataIngestion(!showDataIngestion)}
              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold transition-colors"
            >
              Mre
            </button>
            {showDataIngestion && (
              <DataIngestion onClose={() => setShowDataIngestion(false)} />
            )}
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Top section: Charts + KPI cards ──────────────────────── */}
          <div className="flex gap-0 h-[52%] shrink-0 border-b border-slate-100">

            {/* Charts column (left of right panel) */}
            <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden">

              {/* Cash Flow Trend */}
              <div
                className={`flex-1 p-3 border-b border-slate-100 transition-all ${activeSection === 'cashflow' ? 'ring-2 ring-blue-300 ring-inset' : ''}`}
              >
                <p className="text-[10px] font-bold text-slate-700 mb-1.5">Cash Flow Trend</p>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={cashFlowData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#94a3b8' }} />
                    <YAxis tickFormatter={(v) => `₹${v / 1000}K`} tick={{ fontSize: 7, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={6} wrapperStyle={{ fontSize: 8 }} />
                    <Line type="monotone" dataKey="inflow" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Inflow" />
                    <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Outflow" />
                    <Line type="monotone" dataKey="net" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Net" />
                    <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="3 2" name="Forecast" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Cash Forecast */}
              <div className="flex-1 p-3">
                <p className="text-[10px] font-bold text-slate-700 mb-1.5">Cash Forecast (30/60/90 Days)</p>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={forecastData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#94a3b8' }} />
                    <YAxis tickFormatter={formatINR} tick={{ fontSize: 7, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={6} wrapperStyle={{ fontSize: 8 }} />
                    <Area type="monotone" dataKey="p90" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={1} fillOpacity={0.5} name="P10/P90" />
                    <Area type="monotone" dataKey="p10" fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} fillOpacity={0.4} name="P10/P50/P90" />
                    <Line type="monotone" dataKey="p50" stroke="#0ea5e9" strokeWidth={1.5} dot={false} name="P50" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI + AI Insights sidebar (right of charts) */}
            <div className="w-48 shrink-0 flex flex-col overflow-y-auto">

              {/* KPI cards */}
              {[
                { label: 'Current Balance', value: '₹4.35L', color: 'text-slate-800', bg: 'bg-slate-50', highlight: activeSection === 'kpi' },
                { label: 'Net Cash Flow', value: '₹+45K', color: 'text-emerald-600', bg: 'bg-emerald-50', highlight: false },
                { label: 'Burn Rate', value: '₹12K/Mo', color: 'text-rose-600', bg: 'bg-rose-50', highlight: false },
                { label: 'Runway', value: '2.5 Months', color: 'text-amber-600', bg: 'bg-amber-50', highlight: false },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className={`px-3 py-2.5 border-b border-slate-100 ${kpi.bg} ${kpi.highlight ? 'ring-2 ring-blue-300 ring-inset' : ''} cursor-pointer hover:brightness-95 transition-all`}
                  onClick={() => setActiveSection('kpi')}
                >
                  <p className="text-[9px] text-slate-500 font-medium">{kpi.label}</p>
                  <p className={`text-sm font-bold ${kpi.color} mt-0.5`}>{kpi.value}</p>
                </div>
              ))}

              {/* Burn Rate label repeat (matches reference) */}
              <div className="px-3 py-2 border-b border-slate-100 bg-white">
                <p className="text-[9px] text-slate-500 font-medium">Burn Rate</p>
                <p className="text-sm font-bold text-rose-600 mt-0.5">₹12K/Mo</p>
              </div>

              {/* AI Insights */}
              <div className="px-3 py-2.5 flex-1">
                <p className="text-[9px] font-bold text-slate-700 mb-2 uppercase tracking-wider">AI Insights & Recommendations</p>
                <div className="space-y-2">
                  {[
                    {
                      tier: 'High actions',
                      color: 'bg-rose-50 border-rose-200 text-rose-700',
                      text: 'How can I improve my cash flow? as vector inflows.',
                    },
                    {
                      tier: 'Medium actions',
                      color: 'bg-amber-50 border-amber-200 text-amber-700',
                      text: 'Innovate your cash flow, now conselational castings, and shotcol recommendations.',
                    },
                    {
                      tier: 'Low actions',
                      color: 'bg-slate-50 border-slate-200 text-slate-600',
                      text: 'You can crew manage the A recommendations.',
                    },
                  ].map((item) => (
                    <div key={item.tier} className={`rounded-lg border px-2 py-1.5 ${item.color}`}>
                      <p className="text-[9px] font-bold mb-0.5">{item.tier}</p>
                      <p className="text-[9px] leading-snug">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── AI Chat Panel ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0" style={{ height: '48%' }}>
            <AIChat />
          </div>
        </div>
      </div>
    </div>
  );
}
