'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
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
import { 
  fetchSummary, 
  fetchForecast, 
  fetchRecommendations 
} from '@/lib/api';

import {
  mockRevenueVsExpenses,
  mockReceivablesPayables,
  mockReliabilityScores,
  mockAIInsights,
  mockAlerts
} from '@/lib/mockDashboardData';

const ORG_ID = 1;

export default function DashboardPage() {
  const { demoMode } = useDemoMode();

  // SWR calls with live polling (speeds up when demoMode is active)
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

  // ── SKELETON LOADING GRID ──────────────────────────────────────────────────
  if (!summary || !forecast30 || !forecast60 || !forecast90 || !recommendations) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-350 font-sans p-8 space-y-8">
        {/* Header Skeleton */}
        <header className="flex justify-between items-center pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="h-8 w-64 skeleton-loader rounded" />
            <div className="h-4 w-40 skeleton-loader rounded" />
          </div>
          <div className="h-10 w-24 skeleton-loader rounded" />
        </header>

        {/* Executive Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-850 bg-slate-900/20 p-4 space-y-2">
              <div className="h-3 w-16 skeleton-loader rounded" />
              <div className="h-6 w-24 skeleton-loader rounded" />
            </div>
          ))}
        </div>

        {/* 2 Column skeleton layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column Skeleton */}
          <div className="xl:col-span-7 space-y-8">
            <div className="h-64 rounded-xl border border-slate-855 bg-slate-900/20 p-6 space-y-4">
              <div className="h-4 w-48 skeleton-loader rounded" />
              <div className="h-44 w-full skeleton-loader rounded" />
            </div>
            <div className="h-64 rounded-xl border border-slate-855 bg-slate-900/20 p-6 space-y-4">
              <div className="h-4 w-48 skeleton-loader rounded" />
              <div className="h-44 w-full skeleton-loader rounded" />
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="xl:col-span-5 space-y-8">
            <div className="h-48 rounded-xl border border-slate-855 bg-slate-900/20 p-6 space-y-4">
              <div className="h-4 w-48 skeleton-loader rounded" />
              <div className="h-28 w-full skeleton-loader rounded" />
            </div>
            <div className="h-64 rounded-xl border border-slate-855 bg-slate-900/20 p-6 space-y-4">
              <div className="h-4 w-48 skeleton-loader rounded" />
              <div className="h-44 w-full skeleton-loader rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Translate live inputs to component shapes ────────────────────────────────
  const liveSummary = {
    currentCashBalance: summary.cash_balance,
    netCashFlow: summary.net_cash_flow,
    burnRate: summary.burn_rate,
    cashRunwayMonths: summary.runway_days ? (summary.runway_days / 30) : 2.5,
    liquidityScore: summary.liquidity_score,
    riskLevel: (summary.risk_level?.toLowerCase() as 'low' | 'medium' | 'high') ?? 'low'
  };

  const liveCashFlowTrend = [
    { date: 'Jan', inflow: 380000, outflow: 320000, net: 60000, isForecast: false },
    { date: 'Feb', inflow: 420000, outflow: 360000, net: 60000, isForecast: false },
    { date: 'Mar', inflow: 400000, outflow: 340000, net: 60000, isForecast: false },
    { date: 'Apr', inflow: 480000, outflow: 390000, net: 90000, isForecast: false },
    { date: 'May', inflow: liveSummary.currentCashBalance * 0.95, outflow: 400000, net: liveSummary.currentCashBalance * 0.95 - 400000, isForecast: true },
    { date: 'Jun', inflow: liveSummary.currentCashBalance, outflow: 420000, net: liveSummary.currentCashBalance - 420000, isForecast: true }
  ];

  const liveCashForecast = [
    { date: 'Current', p10: liveSummary.currentCashBalance, p50: liveSummary.currentCashBalance, p90: liveSummary.currentCashBalance },
    { date: '30 Days', p10: forecast30.p10, p50: forecast30.p50, p90: forecast30.p90 },
    { date: '60 Days', p10: forecast60.p10, p50: forecast60.p50, p90: forecast60.p90 },
    { date: '90 Days', p10: forecast90.p10, p50: forecast90.p50, p90: forecast90.p90 }
  ];

  const liveRecommendations = [
    {
      level: 'High' as const,
      actions: recommendations
        .filter(r => r.priority.toLowerCase() === 'high' || r.priority.toLowerCase() === 'critical')
        .map((r, i) => ({ id: `h-${i}`, action: r.title, impact: r.description }))
    },
    {
      level: 'Medium' as const,
      actions: recommendations
        .filter(r => r.priority.toLowerCase() === 'medium')
        .map((r, i) => ({ id: `m-${i}`, action: r.title, impact: r.description }))
    },
    {
      level: 'Low' as const,
      actions: recommendations
        .filter(r => r.priority.toLowerCase() === 'low')
        .map((r, i) => ({ id: `l-${i}`, action: r.title, impact: r.description }))
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 md:text-sm text-xs">
      
      {/* Background Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8 relative">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                THESEUS <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Analytics</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-bold tracking-wide">
              Financial navigation system for SMEs • Active Session: <span className="text-cyan-400 font-semibold font-mono">Demo Co.</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-200">Aegis Operations Ltd</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">ID: ORG-9843</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center font-bold text-white text-sm">
                AO
              </div>
            </div>
          </div>
        </header>

        {/* Alerts Bar */}
        <AlertsBar initialAlerts={mockAlerts} />

        {/* Executive Summary */}
        <section aria-label="Executive Financial Summary">
          <ExecutiveSummary data={liveSummary} />
        </section>

        {/* 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column */}
          <div className="xl:col-span-7 space-y-8">
            <section aria-label="Monthly Cash Flow Trends">
              <CashFlowTrend data={liveCashFlowTrend} />
            </section>

            <section aria-label="Cash Runway Forecast">
              <CashForecast data={liveCashForecast} />
            </section>

            <section aria-label="Receivables and Payables Summary">
              <ReceivablesPayables data={mockReceivablesPayables} />
            </section>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-5 space-y-8">
            <section aria-label="AI Insights">
              <AIInsightsPanel insights={mockAIInsights} />
            </section>

            <section aria-label="Action Recommendations">
              <RecommendationPanel tiers={liveRecommendations} />
            </section>

            <section aria-label="Revenue vs Expenses Comparison">
              <RevenueVsExpenses data={mockRevenueVsExpenses} />
            </section>

            <section aria-label="Counterparty Reliability Scores">
              <ReliabilityScores data={mockReliabilityScores} />
            </section>
          </div>

        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 text-center flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
          <p>© 2026 THESEUS. All financial projections are generated deterministically and mathematically.</p>
          <div className="flex gap-4">
            <a href="/" className="hover:text-cyan-400 transition-colors">Enter Ship Navigation View</a>
            <span>•</span>
            <span className="text-slate-650">System Status: Active</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
