import React from 'react';
import { ExecutiveSummaryData } from '@/types/dashboard';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  Activity, 
  Flame 
} from 'lucide-react';

interface ExecutiveSummaryProps {
  data: ExecutiveSummaryData;
}

export default function ExecutiveSummary({ data }: ExecutiveSummaryProps) {
  const getRiskBadgeColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
      {/* Current Cash Balance */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cash Balance</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {formatCurrency(data.currentCashBalance)}
        </p>
        <span className="text-xs text-slate-500 mt-2 block">Available liquid funds</span>
      </div>

      {/* Net Cash Flow */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net Cash Flow</span>
          <div className={`p-2 rounded-xl border ${
            data.netCashFlow >= 0 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {data.netCashFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        </div>
        <p className={`text-2xl font-bold tracking-tight ${data.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {data.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.netCashFlow)}
        </p>
        <span className="text-xs text-slate-500 mt-2 block">Net movement this month</span>
      </div>

      {/* Burn Rate */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Burn Rate</span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Flame className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {formatCurrency(data.burnRate)}
          <span className="text-sm font-medium text-slate-400">/mo</span>
        </p>
        <span className="text-xs text-slate-500 mt-2 block">Avg. monthly net outflow</span>
      </div>

      {/* Cash Runway */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl group-hover:bg-violet-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Cash Runway</span>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {data.cashRunwayMonths.toFixed(1)}
          <span className="text-sm font-medium text-slate-400"> Months</span>
        </p>
        <span className="text-xs text-slate-500 mt-2 block">Estimated survival time</span>
      </div>

      {/* Liquidity Score */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Liquidity Score</span>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {data.liquidityScore}
          <span className="text-sm font-medium text-slate-400">/100</span>
        </p>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" 
            style={{ width: `${data.liquidityScore}%` }}
          />
        </div>
      </div>

      {/* Risk Level */}
      <div className="relative overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all duration-300 shadow-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-500" />
        <div className="flex justify-between items-start mb-3">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Risk Level</span>
          <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getRiskBadgeColor(data.riskLevel)}`}>
            {data.riskLevel} Risk
          </span>
        </div>
        <span className="text-xs text-slate-500 mt-4 block">Based on volatility & runway</span>
      </div>
    </div>
  );
}
