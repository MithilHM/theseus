import React from 'react';
import { ReceivablesPayablesData } from '@/types/dashboard';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  CalendarDays 
} from 'lucide-react';

interface ReceivablesPayablesProps {
  data: ReceivablesPayablesData;
}

export default function ReceivablesPayables({ data }: ReceivablesPayablesProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getStatusBadge = (status: 'pending' | 'overdue' | 'paid') => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receivables Column */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Receivables</h2>
              <p className="text-xs text-slate-400">Incoming cash and customer invoices</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Total Outstanding</span>
            <span className="text-lg font-bold text-white font-mono">{formatCurrency(data.receivables.totalOutstanding)}</span>
          </div>
        </div>

        {/* Expected Summary */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5 flex justify-between items-center">
          <span className="text-xs text-slate-300 font-medium">Expected Payments This Month</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">{formatCurrency(data.receivables.expectedPaymentsThisMonth)}</span>
        </div>

        {/* Invoices List */}
        <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {data.receivables.outstandingInvoices.map((invoice) => (
            <div 
              key={invoice.id} 
              className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 hover:border-slate-700/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">{invoice.clientName}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono">INV-{invoice.id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-500" /> Due: {invoice.dueDate}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-sm font-bold text-white font-mono">{formatCurrency(invoice.amount)}</span>
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payables Column */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700/80 transition-all duration-300 shadow-xl flex flex-col">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Payables</h2>
              <p className="text-xs text-slate-400">Upcoming obligations and operating costs</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Total Upcoming</span>
            <span className="text-lg font-bold text-white font-mono">{formatCurrency(data.payables.totalUpcoming)}</span>
          </div>
        </div>

        {/* Expected Summary */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-5 flex justify-between items-center">
          <span className="text-xs text-slate-300 font-medium">Taxes & GST Due Soon</span>
          <span className="text-sm font-bold text-rose-400 font-mono">{formatCurrency(data.payables.taxesDueSoon)}</span>
        </div>

        {/* Payments List */}
        <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {data.payables.upcomingPayments.map((payment) => (
            <div 
              key={payment.id} 
              className="flex justify-between items-center p-3 rounded-xl bg-slate-950/40 border border-slate-800/40 hover:border-slate-700/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">{payment.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-medium border border-slate-700">
                    {payment.category}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-500" /> Due: {payment.dueDate}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-white font-mono">{formatCurrency(payment.amount)}</span>
                <span className="text-[10px] text-slate-500 mt-1">Scheduled Auto-Pay</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
