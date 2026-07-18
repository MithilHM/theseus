import { 
  ExecutiveSummaryData, 
  CashFlowTrendPoint, 
  RevenueVsExpensesPoint, 
  CashForecastPoint, 
  ReceivablesPayablesData, 
  ReliabilityScoreItem, 
  AIInsightItem, 
  RecommendationTier, 
  AlertItem 
} from '@/types/dashboard';

export const mockExecutiveSummary: ExecutiveSummaryData = {
  currentCashBalance: 124500,
  netCashFlow: 12450,
  burnRate: 15000,
  cashRunwayMonths: 8.3,
  liquidityScore: 85,
  riskLevel: 'low'
};

export const mockCashFlowTrend: CashFlowTrendPoint[] = [
  { date: 'Oct 2025', inflow: 45000, outflow: 38000, net: 7000, actualBalance: 98000, isForecast: false },
  { date: 'Nov 2025', inflow: 48000, outflow: 41000, net: 7000, actualBalance: 105000, isForecast: false },
  { date: 'Dec 2025', inflow: 52000, outflow: 48000, net: 4000, actualBalance: 109000, isForecast: false },
  { date: 'Jan 2026', inflow: 42000, outflow: 39000, net: 3000, actualBalance: 112000, isForecast: false },
  { date: 'Feb 2026', inflow: 47000, outflow: 43000, net: 4000, actualBalance: 116000, isForecast: false },
  { date: 'Mar 2026', inflow: 55000, outflow: 45000, net: 10000, actualBalance: 126000, isForecast: false },
  { date: 'Apr 2026', inflow: 58000, outflow: 45550, net: 12450, actualBalance: 124500, isForecast: false }, // Current Month
  { date: 'May 2026 (F)', inflow: 60000, outflow: 47000, net: 13000, forecastedBalance: 137500, isForecast: true },
  { date: 'Jun 2026 (F)', inflow: 62000, outflow: 48000, net: 14000, forecastedBalance: 151500, isForecast: true },
  { date: 'Jul 2026 (F)', inflow: 65000, outflow: 50000, net: 15000, forecastedBalance: 166500, isForecast: true }
];

export const mockRevenueVsExpenses: RevenueVsExpensesPoint[] = [
  { month: 'Nov', revenue: 48000, expenses: 41000 },
  { month: 'Dec', revenue: 52000, expenses: 48000 },
  { month: 'Jan', revenue: 42000, expenses: 39000 },
  { month: 'Feb', revenue: 47000, expenses: 43000 },
  { month: 'Mar', revenue: 55000, expenses: 45000 },
  { month: 'Apr', revenue: 58000, expenses: 45550 }
];

export const mockCashForecast: CashForecastPoint[] = [
  { date: 'D+10', p10: 124500, p50: 124500, p90: 124500 },
  { date: 'D+20', p10: 122000, p50: 125000, p90: 128000 },
  { date: 'D+30', p10: 119500, p50: 126200, p90: 133000 },
  { date: 'D+40', p10: 116000, p50: 127800, p90: 139500 },
  { date: 'D+50', p10: 113500, p50: 129000, p90: 144500 },
  { date: 'D+60', p10: 110000, p50: 131500, p90: 152000 },
  { date: 'D+70', p10: 107000, p50: 133000, p90: 159000 },
  { date: 'D+80', p10: 103000, p50: 135200, p90: 167000 },
  { date: 'D+90', p10: 99500, p50: 137500, p90: 175000 }
];

export const mockReceivablesPayables: ReceivablesPayablesData = {
  receivables: {
    outstandingInvoices: [
      { id: '1004', clientName: 'Acme Corporation', amount: 24500, dueDate: '2026-07-20', status: 'pending' },
      { id: '1003', clientName: 'Global Industries', amount: 15000, dueDate: '2026-07-05', status: 'overdue' },
      { id: '1002', clientName: 'Innovate LLC', amount: 8200, dueDate: '2026-06-28', status: 'overdue' },
      { id: '1001', clientName: 'Summit Partners', amount: 12300, dueDate: '2026-07-15', status: 'paid' }
    ],
    totalOutstanding: 47700,
    expectedPaymentsThisMonth: 39500
  },
  payables: {
    upcomingPayments: [
      { id: 'p01', category: 'Salary', description: 'Employee Payroll Q3-M1', amount: 25000, dueDate: '2026-07-28' },
      { id: 'p02', category: 'Rent', description: 'Office HQ Rent', amount: 4500, dueDate: '2026-07-31' },
      { id: 'p03', category: 'Taxes', description: 'Quarterly GST Payment', amount: 12400, dueDate: '2026-07-25' },
      { id: 'p04', category: 'Vendor', description: 'AWS Cloud Services', amount: 1850, dueDate: '2026-07-22' },
      { id: 'p05', category: 'Utilities', description: 'Corporate Internet & Power', amount: 650, dueDate: '2026-07-24' }
    ],
    totalUpcoming: 44400,
    taxesDueSoon: 12400
  }
};

export const mockReliabilityScores: ReliabilityScoreItem[] = [
  { id: 'r01', name: 'Acme Corporation', type: 'customer', score: 94, avgDelayDays: 1, consistency: 'High', frequency: 'Monthly' },
  { id: 'r02', name: 'Summit Partners', type: 'customer', score: 88, avgDelayDays: 2, consistency: 'High', frequency: 'Monthly' },
  { id: 'r03', name: 'AWS Cloud Services', type: 'vendor', score: 99, avgDelayDays: 0, consistency: 'High', frequency: 'Monthly' },
  { id: 'r04', name: 'Global Industries', type: 'customer', score: 72, avgDelayDays: 6, consistency: 'Medium', frequency: 'Ad-hoc' },
  { id: 'r05', name: 'Innovate LLC', type: 'customer', score: 58, avgDelayDays: 14, consistency: 'Low', frequency: 'Ad-hoc' },
  { id: 'r06', name: 'Office HQ Landlord', type: 'vendor', score: 95, avgDelayDays: 0, consistency: 'High', frequency: 'Monthly' }
];

export const mockAIInsights: AIInsightItem[] = [
  { 
    id: 'in01', 
    type: 'success', 
    text: 'Revenue increased by 11% month-over-month, driven primarily by on-time milestone clearance from Acme Corp.',
    agent: 'Analytics Agent'
  },
  { 
    id: 'in02', 
    type: 'info', 
    text: 'Cash runway remains solid at 8.3 months. Available cash balance ($124,500) exceeds the recommended 6-month buffer ($90,000) by 38%.',
    agent: 'Analytics Agent'
  },
  { 
    id: 'in03', 
    type: 'warning', 
    text: 'Innovate LLC is currently 20 days overdue on invoice #1002 ($8,200). Historically, their payment consistency rating is low with an average delay of 14 days.',
    agent: 'Course of Action Agent'
  },
  { 
    id: 'in04', 
    type: 'info', 
    text: 'Under Section 4.2 of the AWS vendor agreement, billing cycle changes require 30 days prior notice. AWS payments are on-time and highly reliable.',
    agent: 'Document Intelligence Agent'
  }
];

export const mockRecommendations: RecommendationTier[] = [
  {
    level: 'High',
    actions: [
      { id: 'rec01', action: 'Send automated reminder with draft letter to Innovate LLC for overdue invoice #1002 ($8,200).', impact: 'Accelerates inflow by $8,200', targetDate: 'As soon as possible' },
      { id: 'rec02', action: 'Verify GST cash allocation before July 25 to avoid late-filing penalty of $250.', impact: 'Saves $250 in penalty fees', targetDate: '2026-07-23' }
    ]
  },
  {
    level: 'Medium',
    actions: [
      { id: 'rec03', action: 'Discuss expanding invoice credit terms with Global Industries to align with their 6-day average delay.', impact: 'Improves forecast accuracy by 12%', targetDate: '2026-07-30' },
      { id: 'rec04', action: 'Review AWS server usage trends to trim estimated cloud fees.', impact: 'Saves ~$300/month', targetDate: '2026-08-05' }
    ]
  },
  {
    level: 'Low',
    actions: [
      { id: 'rec05', action: 'Allocate $20,000 of surplus cash to short-term yielding Treasury accounts.', impact: 'Generates ~$80/month passive yield', targetDate: '2026-08-15' }
    ]
  }
];

export const mockAlerts: AlertItem[] = [
  { id: 'al01', type: 'invoice', severity: 'critical', message: 'Invoice INV-1003 (Global Industries) is 13 days overdue ($15,000).' },
  { id: 'al02', type: 'tax', severity: 'warning', message: 'Quarterly GST tax filing of $12,400 due in 7 days.' },
  { id: 'al03', type: 'payroll', severity: 'info', message: 'Employee payroll processing ($25,000) scheduled for July 28.' },
  { id: 'al04', type: 'expense', severity: 'warning', message: 'Unusual cloud hosting spend spike detected: +28% AWS fees vs baseline.' }
];
