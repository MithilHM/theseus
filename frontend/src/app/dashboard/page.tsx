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

// Import realistic mock data
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

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background Gradient Orbs for Sleek Aesthetic */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[450px] h-[450px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 relative">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚢</span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                THESEUS <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Copilot</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 font-medium tracking-wide">
              Financial navigation system for SMEs • Active Session: <span className="text-cyan-400 font-semibold font-mono">Demo Co.</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-slate-200">Aegis Operations Ltd</span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider font-mono">ID: ORG-9843</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/10">
              <div className="w-full h-full rounded-[10px] bg-slate-905 flex items-center justify-center font-bold text-white text-sm">
                AO
              </div>
            </div>
          </div>
        </header>

        {/* Alerts Bar */}
        <AlertsBar initialAlerts={mockAlerts} />

        {/* Executive Summary (Full Width at Top) */}
        <section aria-label="Executive Financial Summary">
          <ExecutiveSummary data={mockExecutiveSummary} />
        </section>

        {/* 2-Column Dashboard Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left Column - Financial Projections & Tables (xl:col-span-7) */}
          <div className="xl:col-span-7 space-y-8">
            
            {/* Cash Flow Trend Chart */}
            <section aria-label="Monthly Cash Flow Trends">
              <CashFlowTrend data={mockCashFlowTrend} />
            </section>

            {/* Cash Forecast Confidence Intervals Chart */}
            <section aria-label="Cash Runway Forecast">
              <CashForecast data={mockCashForecast} />
            </section>

            {/* Receivables vs Payables Lists */}
            <section aria-label="Receivables and Payables Summary">
              <ReceivablesPayables data={mockReceivablesPayables} />
            </section>

          </div>

          {/* Right Column - AI Insights, Recommendations & Operations (xl:col-span-5) */}
          <div className="xl:col-span-5 space-y-8">
            
            {/* Copilot AI Insights Panel */}
            <section aria-label="AI Insights">
              <AIInsightsPanel insights={mockAIInsights} />
            </section>

            {/* Course of Action / Recommendation Panel */}
            <section aria-label="Action Recommendations">
              <RecommendationPanel tiers={mockRecommendations} />
            </section>

            {/* Monthly Revenue vs Expenses Grouped Bar Chart */}
            <section aria-label="Revenue vs Expenses Comparison">
              <RevenueVsExpenses data={mockRevenueVsExpenses} />
            </section>

            {/* Entity/Counterparty Reliability Scores Table */}
            <section aria-label="Counterparty Reliability Scores">
              <ReliabilityScores data={mockReliabilityScores} />
            </section>

          </div>

        </div>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800/80 text-center flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-medium">
          <p>© 2026 THESEUS. All financial projections are generated deterministically and mathematically.</p>
          <div className="flex gap-4">
            <a href="/" className="hover:text-cyan-400 transition-colors">Enter Ship Navigation View</a>
            <span>•</span>
            <a href="#" className="hover:text-cyan-400 transition-colors">System Status: Active</a>
          </div>
        </footer>

      </div>
    </div>
  );
}
