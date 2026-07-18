export interface ExecutiveSummaryData {
  currentCashBalance: number;
  netCashFlow: number;
  burnRate: number;
  cashRunwayMonths: number;
  liquidityScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CashFlowTrendPoint {
  date: string; // e.g. "2026-01"
  inflow: number;
  outflow: number;
  net: number;
  forecastedBalance?: number;
  actualBalance?: number;
  isForecast: boolean;
}

export interface RevenueVsExpensesPoint {
  month: string; // e.g. "Jan", "Feb"
  revenue: number;
  expenses: number;
}

export interface CashForecastPoint {
  date: string; // e.g. "D+10", "D+30"
  p10: number; // Pessimistic (lower bound)
  p50: number; // Expected (solid line)
  p90: number; // Optimistic (upper bound)
}

export interface InvoiceItem {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'paid';
}

export interface PaymentItem {
  id: string;
  category: 'Salary' | 'Rent' | 'Taxes' | 'Vendor' | 'Utilities' | 'Other';
  description: string;
  amount: number;
  dueDate: string;
}

export interface ReceivablesPayablesData {
  receivables: {
    outstandingInvoices: InvoiceItem[];
    totalOutstanding: number;
    expectedPaymentsThisMonth: number;
  };
  payables: {
    upcomingPayments: PaymentItem[];
    totalUpcoming: number;
    taxesDueSoon: number;
  };
}

export interface ReliabilityScoreItem {
  id: string;
  name: string;
  type: 'customer' | 'vendor';
  score: number; // 0 - 100
  avgDelayDays: number;
  consistency: 'High' | 'Medium' | 'Low';
  frequency: string; // e.g. "Weekly", "Monthly", "Ad-hoc"
}

export interface AIInsightItem {
  id: string;
  type: 'info' | 'warning' | 'success';
  text: string;
  agent: 'Analytics Agent' | 'Course of Action Agent' | 'Document Intelligence Agent';
}

export interface RecommendationAction {
  id: string;
  action: string;
  impact: string;
  targetDate?: string;
}

export interface RecommendationTier {
  level: 'High' | 'Medium' | 'Low';
  actions: RecommendationAction[];
}

export interface AlertItem {
  id: string;
  type: 'cash' | 'tax' | 'payroll' | 'invoice' | 'expense';
  message: string;
  severity: 'critical' | 'warning' | 'info';
}
