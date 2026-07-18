import React from 'react';
import { AIInsightItem } from '@/types/dashboard';
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  HelpCircle,
  BrainCircuit
} from 'lucide-react';

interface AIInsightsPanelProps {
  insights: AIInsightItem[];
}

export default function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  const getInsightStyles = (type: 'info' | 'warning' | 'success') => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/20',
          text: 'text-emerald-400',
          icon: <TrendingUp className="w-4 h-4 text-emerald-400" />
        };
      case 'warning':
        return {
          bg: 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20',
          text: 'text-rose-400',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-cyan-500/5 border-cyan-500/10 hover:border-cyan-500/20',
          text: 'text-cyan-400',
          icon: <Sparkles className="w-4 h-4 text-cyan-400" />
        };
    }
  };

  const getAgentColor = (agent: string) => {
    switch (agent) {
      case 'Analytics Agent':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Course of Action Agent':
        return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
      case 'Document Intelligence Agent':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">Copilot Insights</h2>
          <p className="text-xs text-slate-400">Contextual financial intelligence</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto pr-1">
        {insights.map((insight) => {
          const styles = getInsightStyles(insight.type);
          return (
            <div 
              key={insight.id} 
              className={`p-4 rounded-xl border transition-all duration-300 ${styles.bg} group`}
            >
              <div className="flex justify-between items-start gap-4 mb-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getAgentColor(insight.agent)}`}>
                  {insight.agent}
                </span>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  {styles.icon}
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {insight.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
