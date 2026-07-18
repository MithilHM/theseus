import React from 'react';
import { ReliabilityScoreItem } from '@/types/dashboard';
import { ShieldCheck, User, Building, AlertTriangle } from 'lucide-react';

interface ReliabilityScoresProps {
  data: ReliabilityScoreItem[];
}

export default function ReliabilityScores({ data }: ReliabilityScoresProps) {
  // Sort data by score descending
  const sortedData = [...data].sort((a, b) => b.score - a.score);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getConsistencyBadge = (consistency: 'High' | 'Medium' | 'Low') => {
    switch (consistency) {
      case 'High':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Low':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" /> Counterparty Reliability Scores
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Ranked scoring based on delay history, volatility, and frequency</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <th className="pb-3 font-semibold">Entity</th>
              <th className="pb-3 font-semibold text-center">Score</th>
              <th className="pb-3 font-semibold text-center">Avg Delay</th>
              <th className="pb-3 font-semibold text-center">Consistency</th>
              <th className="pb-3 font-semibold text-right">Frequency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-xs">
            {sortedData.map((item, idx) => (
              <tr 
                key={item.id} 
                className="hover:bg-slate-950/40 transition-colors group"
              >
                {/* Entity info */}
                <td className="py-3.5 pr-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] text-slate-500 font-mono w-4">#{idx + 1}</span>
                    <div className="p-1.5 rounded-lg bg-slate-850 border border-slate-800 text-slate-400 group-hover:border-slate-700/60 transition-colors">
                      {item.type === 'customer' ? <User className="w-3.5 h-3.5" /> : <Building className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{item.name}</p>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">{item.type}</span>
                    </div>
                  </div>
                </td>

                {/* Score */}
                <td className="py-3.5 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                </td>

                {/* Avg Delay */}
                <td className="py-3.5 text-center font-mono text-slate-300">
                  {item.avgDelayDays > 0 ? (
                    <span className={item.avgDelayDays > 5 ? 'text-rose-400' : 'text-slate-300'}>
                      {item.avgDelayDays} days
                    </span>
                  ) : item.avgDelayDays === 0 ? (
                    <span className="text-emerald-400 font-semibold">On-time</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">-{Math.abs(item.avgDelayDays)} days early</span>
                  )}
                </td>

                {/* Consistency */}
                <td className="py-3.5 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${getConsistencyBadge(item.consistency)}`}>
                    {item.consistency}
                  </span>
                </td>

                {/* Frequency */}
                <td className="py-3.5 text-right font-medium text-slate-400">
                  {item.frequency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
