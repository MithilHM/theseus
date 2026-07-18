import React, { useState } from 'react';
import { AlertItem } from '@/types/dashboard';
import { 
  AlertOctagon, 
  X, 
  Percent, 
  Users, 
  FileWarning, 
  PiggyBank, 
  TrendingUp 
} from 'lucide-react';

interface AlertsBarProps {
  initialAlerts: AlertItem[];
}

export default function AlertsBar({ initialAlerts }: AlertsBarProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(item => item.id !== id));
  };

  const getAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'cash':
        return <PiggyBank className="w-4 h-4" />;
      case 'tax':
        return <Percent className="w-4 h-4" />;
      case 'payroll':
        return <Users className="w-4 h-4" />;
      case 'invoice':
        return <FileWarning className="w-4 h-4" />;
      case 'expense':
      default:
        return <AlertOctagon className="w-4 h-4" />;
    }
  };

  const getSeverityStyles = (severity: AlertItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:border-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.05)]';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/35';
      case 'info':
      default:
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/35';
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="w-full flex flex-wrap gap-3 animate-fade-in">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition-all duration-300 ${getSeverityStyles(alert.severity)}`}
        >
          <div className="flex items-center gap-2">
            {getAlertIcon(alert.type)}
            <span>{alert.message}</span>
          </div>
          <button 
            onClick={() => dismissAlert(alert.id)}
            className="p-0.5 rounded-md hover:bg-white/10 transition-colors text-current ml-2 focus:outline-none cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
