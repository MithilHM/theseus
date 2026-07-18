import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { CashForecastPoint } from '@/types/dashboard';

interface CashForecastProps {
  data: CashForecastPoint[];
}

export default function CashForecast({ data }: CashForecastProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find items manually because the range area payload might be formatted as an array
      const p50Data = payload.find((p: any) => p.dataKey === 'p50');
      const rangeData = payload.find((p: any) => Array.isArray(p.value) || p.dataKey === 'p90' || (p.dataKey && p.dataKey[0] === 'p10'));
      
      const p50Val = p50Data ? p50Data.value : null;
      let p10Val = null;
      let p90Val = null;

      if (rangeData) {
        if (Array.isArray(rangeData.value)) {
          p10Val = rangeData.value[0];
          p90Val = rangeData.value[1];
        } else {
          // If rangeData.value is just p90, try to pull p10/p90 from payload raw data
          p10Val = rangeData.payload.p10;
          p90Val = rangeData.payload.p90;
        }
      } else if (payload[0]?.payload) {
        p10Val = payload[0].payload.p10;
        p90Val = payload[0].payload.p90;
      }

      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-slate-400 text-xs font-bold mb-2">Forecast Horizon: {label}</p>
          <div className="space-y-1.5">
            {p90Val !== null && (
              <div className="flex justify-between items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2.5 h-0.5 bg-emerald-400" />
                  Optimistic (P90)
                </span>
                <span className="font-mono text-white font-semibold">
                  {formatCurrency(p90Val)}
                </span>
              </div>
            )}
            {p50Val !== null && (
              <div className="flex justify-between items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <span className="w-2.5 h-0.5 bg-cyan-400" />
                  Expected (P50)
                </span>
                <span className="font-mono text-white font-semibold">
                  {formatCurrency(p50Val)}
                </span>
              </div>
            )}
            {p10Val !== null && (
              <div className="flex justify-between items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                  <span className="w-2.5 h-0.5 bg-rose-400" />
                  Pessimistic (P10)
                </span>
                <span className="font-mono text-white font-semibold">
                  {formatCurrency(p10Val)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 border-t border-slate-800/80 pt-2 italic">
            90% confidence interval derived via Monte Carlo engine.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Cash Runway Forecast</h2>
          <p className="text-xs text-slate-400 mt-0.5">30, 60, and 90-day cash projections with P10/P50/P90 confidence intervals</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-sm" /> P10-P90 Range
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-0.5 bg-cyan-400" /> P50 Expected
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `$${val / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Shaded Area between P10 and P90 */}
            <Area
              name="Confidence Band"
              dataKey="p90"
              stroke="none"
              fill="url(#forecastBand)"
              fillOpacity={1}
            />
            
            {/* Re-define the lower bound as a helper to visually mask or we can just draw lines */}
            {/* In recharts, drawing another area that covers p10 with background color works as a mask */}
            <Area
              dataKey="p10"
              stroke="none"
              fill="#0f172a"
              fillOpacity={1}
            />

            {/* P50 Expected Cash Line */}
            <Area 
              type="monotone" 
              name="p50" 
              dataKey="p50" 
              stroke="#22d3ee" 
              strokeWidth={3} 
              fill="none"
            />

            {/* Visual helpers for target horizons */}
            <ReferenceLine x="D+30" stroke="#334155" strokeDasharray="3 3" />
            <ReferenceLine x="D+60" stroke="#334155" strokeDasharray="3 3" />
            <ReferenceLine x="D+90" stroke="#334155" strokeDasharray="3 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
