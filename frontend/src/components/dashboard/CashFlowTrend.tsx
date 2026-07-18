import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { CashFlowTrendPoint } from '@/types/dashboard';

interface CashFlowTrendProps {
  data: CashFlowTrendPoint[];
}

export default function CashFlowTrend({ data }: CashFlowTrendProps) {
  // Find the date where forecast starts
  const forecastStartPoint = data.find(p => p.isForecast);
  const forecastStartDate = forecastStartPoint ? forecastStartPoint.date : '';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isForecastPoint = payload[0].payload.isForecast;
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-slate-400 text-xs font-bold mb-2 flex items-center gap-1.5">
            {label} 
            {isForecastPoint && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-[10px] text-cyan-400 font-medium uppercase tracking-wider border border-cyan-500/20">
                Forecasted
              </span>
            )}
          </p>
          <div className="space-y-1.5">
            {payload.map((p: any, idx: number) => {
              if (p.value === undefined || p.value === null) return null;
              return (
                <div key={idx} className="flex justify-between items-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="font-mono text-white font-semibold">
                    {formatCurrency(p.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Cash Flow Trend</h2>
          <p className="text-xs text-slate-400 mt-0.5">Historical and projected monthly inflows, outflows, and net position</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Inflow
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Outflow
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Net Cash
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
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
            
            {/* Background Area for Inflow & Outflow */}
            <Area 
              type="monotone" 
              name="Inflow" 
              dataKey="inflow" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#inflowGrad)" 
            />
            <Area 
              type="monotone" 
              name="Outflow" 
              dataKey="outflow" 
              stroke="#f43f5e" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#outflowGrad)" 
            />

            {/* Net Cash Line */}
            <Line 
              type="monotone" 
              name="Net Cash" 
              dataKey="net" 
              stroke="#22d3ee" 
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 1, stroke: '#0f172a' }}
              activeDot={{ r: 6 }}
            />

            {/* Vertical Line where forecast begins */}
            {forecastStartDate && (
              <ReferenceLine 
                x={forecastStartDate} 
                stroke="#64748b" 
                strokeDasharray="4 4" 
                label={{ 
                  value: 'Forecast Starts', 
                  position: 'top', 
                  fill: '#94a3b8', 
                  fontSize: 10,
                  fontWeight: 'bold',
                  offset: 15
                }} 
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
