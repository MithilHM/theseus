'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import ShipView from '@/components/ship/ShipView';
import { useDemoMode } from '@/lib/demoContext';
import { fetchSummary, fetchForecast, fetchRecommendations } from '@/lib/api';

// Hardcoded for demo
const ORG_ID = 1;

const formatINR = (v: number) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(2)}L`
    : `₹${Math.round(v / 1000)}K`;

export default function HomePage() {
  const { demoMode } = useDemoMode();
  
  // Poll summary, forecast and recommendations
  const { data: summary, error: summaryErr } = useSWR(
    `summary-${ORG_ID}`, 
    () => fetchSummary(ORG_ID), 
    { refreshInterval: demoMode ? 1500 : 4000 }
  );

  const { data: forecast90 } = useSWR(
    `forecast-90-${ORG_ID}`, 
    () => fetchForecast(ORG_ID, 90), 
    { refreshInterval: demoMode ? 3000 : 8000 }
  );

  const { data: recommendations } = useSWR(
    `recs-${ORG_ID}`, 
    () => fetchRecommendations(ORG_ID), 
    { refreshInterval: demoMode ? 2000 : 6000 }
  );

  const isLoading = !summary || !forecast90;

  // Compile icebergs list (same as upstream)
  const computedIcebergs = [
    {
      id: 'icb-acme',
      label: 'Customer Acme Overdue',
      severity: 'high' as const,
      onClick: () => console.log('clicked icb-acme'),
    },
    {
      id: 'icb-anomaly',
      label: 'Anomaly: Spend Spike',
      severity: 'medium' as const,
      onClick: () => console.log('clicked icb-anomaly'),
    },
  ];

  const computedIslands = [
    {
      id: 'isl-q3',
      label: 'Q3 Revenue Port',
      distancePct: 0.8,
      onClick: () => console.log('clicked isl-q3'),
    },
  ];

  const computedSpikes = [
    {
      id: 'spike-forecast',
      positionPct: 0.65,
      onClick: () => console.log('clicked spike'),
    },
  ];

  return (
    <div className="flex w-full h-screen bg-[#EAF6FF] overflow-hidden font-sans">
      
      {/* ── LEFT PANEL: Ship Visualization (60%) ── */}
      <div className="w-[60%] h-full relative flex flex-col">
        {/* Navbar-like header in the top left */}
        <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚢</span>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">THESEUS <span className="text-[#4A90E2] font-semibold">Ship View</span></h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Financial Navigation · Interactive Visualization</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden mt-16">
          {!isLoading && (
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
              loading={isLoading}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Dashboard (40%) ── */}
      <div className="w-[40%] h-full bg-[#f8fafc] border-l border-[#E6EAF0] shadow-2xl flex flex-col z-20">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EAF0] bg-white flex justify-end">
          <button className="px-4 py-1.5 rounded-full border border-[#E6EAF0] text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            ← Dashboard
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Live Props — Demo Controls</h2>
          
          {/* We will replace this section in Phase 3 with the actual Dashboard redesign */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E6EAF0] p-4">
            <p className="text-sm font-bold text-slate-800">Dashboard Components</p>
            <p className="text-xs text-slate-500 mt-2">To be implemented in Phase 3...</p>
          </div>
        </div>

      </div>
    </div>
  );
}
