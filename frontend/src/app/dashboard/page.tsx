'use client';

import React from 'react';
import AlertsBar from '@/components/dashboard/AlertsBar';
import ExecutiveSummary from '@/components/dashboard/ExecutiveSummary';
import CashFlowTrend from '@/components/dashboard/CashFlowTrend';
import RevenueVsExpenses from '@/components/dashboard/RevenueVsExpenses';
import CashForecast from '@/components/dashboard/CashForecast';
import ReceivablesPayables from '@/components/dashboard/ReceivablesPayables';
import ReliabilityScores from '@/components/dashboard/ReliabilityScores';
import AIInsightsPanel from '@/components/dashboard/AIInsightsPanel';
import RecommendationPanel from '@/components/dashboard/RecommendationPanel';
import { useDemoMode } from '@/lib/demoContext';
import useSWR from 'swr';
import { 
  fetchSummary, 
  fetchForecast, 
  fetchRecommendations 
} from '@/lib/api';

// Import realistic mock data for static parts not wired to backend yet
import {
  mockExecutiveSummary,
  mockCashFlowTrend,
  mockRevenueVsExpenses,
  mockCashForecast,
  mockReceivablesPayables,
  mockReliabilityScores,
  mockAIInsights,
  mockRecommendations,
  mockAlerts
} from '@/lib/mockDashboardData';

const ORG_ID = 1;

export default function DashboardPage() {
  const { demoMode } = useDemoMode();

  // SWR calls with live polling
  const { data: summary } = useSWR(
    `summary-${ORG_ID}`, 
    () => fetchSummary(ORG_ID), 
    { refreshInterval: demoMode ? 1500 : 4000 }
  );

  const { data: forecast30 } = useSWR(
    `forecast-30-${ORG_ID}`, 
    () => fetchForecast(ORG_ID, 30), 
    { refreshInterval: demoMode ? 3000 : 8000 }
  );

  const { data: forecast60 } = useSWR(
    `forecast-60-${ORG_ID}`, 
    () => fetchForecast(ORG_ID, 60), 
    { refreshInterval: demoMode ? 3000 : 8000 }
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

  if (!summary || !forecast30 || !forecast60 || !forecast90 || !recommendations) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-300 font-sans p-8 space-y-8">
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="h-8 w-64 skeleton-loader rounded" />
            <div className="h-4 w-40 skeleton-loader rounded" />
          </div>
          <div className="h-10 w-24 skeleton-loader rounded" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
              <div className="h-3 w-16 skeleton-loader rounded" />
              <div className="h-6 w-24 skeleton-loader rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 relative">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚢</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                THESEUS <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Copilot</span>
              </h1>
            </div>
          </div>
        </header>
        <AlertsBar initialAlerts={mockAlerts} />
        <section aria-label="Executive Financial Summary">
          <ExecutiveSummary data={mockExecutiveSummary} />
        </section>
      </div>
    </div>
  );
}
