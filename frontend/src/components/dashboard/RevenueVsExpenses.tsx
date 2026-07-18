import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { RevenueVsExpensesPoint } from '@/types/dashboard';

interface RevenueVsExpensesProps {
  data: RevenueVsExpensesPoint[];
}

export default function RevenueVsExpenses({ data }: RevenueVsExpensesProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-slate-400 text-xs font-bold mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                  {p.name}
                </span>
                <span className="font-mono text-white font-semibold">
                  {formatCurrency(p.value)}
                </span>
              </div>
            ))}
            <div className="pt-1.5 border-t border-slate-800 flex justify-between items-center gap-6 text-sm font-medium">
              <span className="text-slate-400">Profit</span>
              <span className={`font-mono font-bold ${
                payload[0].value - payload[1].value >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(payload[0].value - payload[1].value)}
              </span>
            </div>
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
          <h2 className="text-lg font-bold text-white tracking-tight">Revenue vs. Expenses</h2>
          <p className="text-xs text-slate-400 mt-0.5">Comparison of gross monthly income against total business expenses</p>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-500" /> Revenue
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="month" 
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
            <Bar 
              name="Revenue" 
              dataKey="revenue" 
              fill="#06b6d4" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            />
            <Bar 
              name="Expenses" 
              dataKey="expenses" 
              fill="#f43f5e" 
              radius={[4, 4, 0, 0]} 
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
