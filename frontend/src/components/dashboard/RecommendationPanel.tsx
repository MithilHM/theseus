import React from 'react';
import { RecommendationTier } from '@/types/dashboard';
import { 
  CheckSquare, 
  AlertTriangle, 
  HelpCircle, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';

interface RecommendationPanelProps {
  tiers: RecommendationTier[];
}

export default function RecommendationPanel({ tiers }: RecommendationPanelProps) {
  const getTierStyles = (level: 'High' | 'Medium' | 'Low') => {
    switch (level) {
      case 'High':
        return {
          titleColor: 'text-rose-400',
          borderColor: 'border-rose-500/20',
          bgHeader: 'bg-rose-500/10',
          bulletColor: 'text-rose-400 bg-rose-500/10',
          glow: 'shadow-rose-500/5'
        };
      case 'Medium':
        return {
          titleColor: 'text-amber-400',
          borderColor: 'border-amber-500/20',
          bgHeader: 'bg-amber-500/10',
          bulletColor: 'text-amber-400 bg-amber-500/10',
          glow: 'shadow-amber-500/5'
        };
      case 'Low':
        return {
          titleColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/20',
          bgHeader: 'bg-emerald-500/10',
          bulletColor: 'text-emerald-400 bg-emerald-500/10',
          glow: 'shadow-emerald-500/5'
        };
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">AI Playbook & Course of Action</h2>
          <p className="text-xs text-slate-400">Gemma-prioritized strategic operations</p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        {tiers.map((tier) => {
          const styles = getTierStyles(tier.level);
          return (
            <div 
              key={tier.level} 
              className={`rounded-2xl border ${styles.borderColor} bg-slate-950/40 p-4 transition-all duration-300 shadow-lg ${styles.glow}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${styles.bgHeader} ${styles.titleColor}`}>
                  {tier.level} Priority
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {tier.actions.length} Action{tier.actions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Actions List */}
              <div className="space-y-3.5">
                {tier.actions.map((act) => (
                  <div key={act.id} className="flex gap-3 items-start group">
                    <div className={`mt-0.5 p-1 rounded-lg ${styles.bulletColor} transition-transform group-hover:scale-110`}>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 leading-snug group-hover:text-white transition-colors">
                        {act.action}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        <span className="flex items-center gap-1 text-cyan-400 font-semibold uppercase tracking-wider">
                          <TrendingUp className="w-3 h-3" /> Impact: {act.impact}
                        </span>
                        {act.targetDate && (
                          <span className="flex items-center gap-1 text-slate-500 font-medium">
                            <Clock className="w-3 h-3" /> Target: {act.targetDate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
