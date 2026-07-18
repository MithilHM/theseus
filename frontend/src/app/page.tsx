'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import ShipView from '@/components/ship/ShipView';
import Modal from '@/components/dashboard/Modal';
import { useDemoMode } from '@/lib/demoContext';
import { 
  fetchSummary, 
  fetchForecast, 
  fetchRecommendations, 
  fetchReminderDraft 
} from '@/lib/api';
import RagChatUI from '@/components/dashboard/RagChatUI';
import DataIngestion from '@/components/dashboard/DataIngestion';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import {
  Home, FileText, CheckSquare, BarChart2, Settings, HelpCircle, Bell,
  Paperclip, Send, Play, Pause, RefreshCw, X
} from 'lucide-react';

const ORG_ID = 1;

const formatINR = (v: number) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(2)}L`
    : `₹${Math.round(v / 1000)}K`;

// ─── Chart Data ───────────────────────────────────────────────────────────────
const cashFlowData = [
  { month: 'Jan', inflow: 3.8, outflow: 3.2, net: 0.6, forecast: null },
  { month: 'Feb', inflow: 4.2, outflow: 3.6, net: 0.6, forecast: null },
  { month: 'Mar', inflow: 4.0, outflow: 3.4, net: 0.6, forecast: null },
  { month: 'Apr', inflow: 4.8, outflow: 3.9, net: 0.9, forecast: null },
  { month: 'May', inflow: 4.5, outflow: 4.0, net: 0.5, forecast: 4.5 },
  { month: 'June', inflow: 5.0, outflow: 4.2, net: 0.8, forecast: 4.8 },
];

const forecastData = [
  { label: '0 Days', p10: 43.5, p50: 43.5, p90: 43.5 },
  { label: '30 Days', p10: 45.0, p50: 49.0, p90: 53.0 },
  { label: '60 Days', p10: 55.0, p50: 65.0, p90: 75.0 },
  { label: '90 Days', p10: 70.0, p50: 85.0, p90: 100.0 },
];

const burnRateData = [
  { month: 'Jan', burn: 3.2 }, { month: 'Feb', burn: 3.6 },
  { month: 'Mar', burn: 3.4 }, { month: 'Apr', burn: 3.9 },
  { month: 'May', burn: 4.0 }, { month: 'Jun', burn: 4.2 },
];

const runwayData = [
  { month: 'Jan', days: 110 }, { month: 'Feb', days: 130 },
  { month: 'Mar', days: 115 }, { month: 'Apr', days: 140 },
  { month: 'May', days: 75 },  { month: 'Jun', days: 90 },
];

const netCashData = [
  { month: 'Jan', net: 0.6 }, { month: 'Feb', net: 0.6 },
  { month: 'Mar', net: 0.6 }, { month: 'Apr', net: 0.9 },
  { month: 'May', net: 0.5 }, { month: 'Jun', net: 0.8 },
];

// ─── Card → Annotation + Graph config ────────────────────────────────────────
type CardId = 'balance' | 'netcash' | 'burnrate' | 'runway' | 'cashflow' | 'forecast';

const CARD_META: Record<CardId, { annotationId: string; label: string; color: string }> = {
  balance:  { annotationId: 'ann-water',     label: 'Current Balance',      color: '#3b82f6' },
  netcash:  { annotationId: 'ann-water',     label: 'Net Cash Flow',        color: '#10b981' },
  burnrate: { annotationId: 'ann-turbulence',label: 'Burn Rate',            color: '#ef4444' },
  runway:   { annotationId: 'ann-runway',    label: 'Runway',               color: '#8b5cf6' },
  cashflow: { annotationId: 'ann-turbulence',label: 'Cash Flow Trend',      color: '#3b82f6' },
  forecast: { annotationId: 'ann-storm',     label: 'Cash Forecast',        color: '#0284c7' },
};

// ─── Timeline Keyframes ───────────────────────────────────────────────────────
const getTimelineData = (day: number) => {
  const keyframes = [
    { day: 0,  cash: 320000, runway: 110, volatility: 0.40, risk: 0.30, rec: 'Sailing smoothly. Maintain standard cash buffer.' },
    { day: 30, cash: 580000, runway: 160, volatility: 0.22, risk: 0.12, rec: 'Excellent runway. Consider expanding business credit terms.' },
    { day: 60, cash: 435000, runway: 75,  volatility: 0.18, risk: 0.15, rec: 'Runway stable. Clear outstanding customer Acme invoice.' },
    { day: 75, cash: 220000, runway: 28,  volatility: 0.82, risk: 0.85, rec: 'Shortfall alert! Low runway due to overdue customer Acme invoice.' },
    { day: 90, cash: 520000, runway: 140, volatility: 0.25, risk: 0.18, rec: 'Invoice cleared! Cash runway fully restored to healthy levels.' },
  ];
  let lower = keyframes[0], upper = keyframes[keyframes.length - 1];
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (day >= keyframes[i].day && day <= keyframes[i + 1].day) {
      lower = keyframes[i]; upper = keyframes[i + 1]; break;
    }
  }
  const t = upper.day === lower.day ? 0 : (day - lower.day) / (upper.day - lower.day);
  const icebergs: any[] = [];
  if (day >= 45 && day <= 85) {
    const f = day <= 75 ? (day - 45) / 30 : (85 - day) / 10;
    icebergs.push({ id: 'icb-acme', label: `Acme Overdue: ₹${Math.round(8200 * f + 1000)}`, severity: f > 0.6 ? 'high' : f > 0.3 ? 'medium' : 'low' as any, onClick: () => {} });
  }
  if (day >= 65 && day <= 80) icebergs.push({ id: 'icb-anomaly', label: 'Unusual Cloud Hosting Spend', severity: 'medium' as any, onClick: () => {} });
  const anomalySpikes: any[] = [];
  if (Math.round(day) === 75) anomalySpikes.push({ id: 'spike-75', positionPct: 0.68, onClick: () => {} });
  return {
    cashBalance: lower.cash + (upper.cash - lower.cash) * t,
    runwayDays: Math.round(lower.runway + (upper.runway - lower.runway) * t),
    forecastVolatility: lower.volatility + (upper.volatility - lower.volatility) * t,
    shortfallRisk: lower.risk + (upper.risk - lower.risk) * t,
    recommendationSummary: t < 0.5 ? lower.rec : upper.rec,
    icebergs, anomalySpikes,
  };
};

// ─── Gemma Narrative ─────────────────────────────────────────────────────────
const getGemmaNarrative = (day: number, isLive: boolean, summary: any) => {
  if (isLive) {
    const b = formatINR(summary?.cash_balance ?? 435000);
    return `I have analyzed your live database metrics. Your current cash balance is ${b} with a runway of ${summary?.runway_days ?? 75} days. Volatility remains low (18%). I recommend following up on the outstanding invoice from Acme to clear any potential shortfall risks.`;
  }
  if (day < 20)  return `Day ${day}: Business is sailing smoothly with a cash balance of ~₹3.20L and a runway buffer of 110 days. Market volatility is low. No immediate actions needed.`;
  if (day < 50)  return `Day ${day}: Cash balance has expanded to ~₹5.80L, providing an excellent 160-day runway. Consider deploying ₹20K of surplus to interest-yielding Treasury accounts.`;
  if (day < 70)  return `Day ${day}: Cash balances are moderate (₹4.35L), but customer Acme's invoice is approaching its due date. Prepare automated reminder drafts now.`;
  if (day < 85)  return `Day ${day} ⚠️: Severe cash shortfall detected! Acme's payment delay has dropped runway to just 28 days. Storm clouds are fully active — send the overdue reminder immediately.`;
  return `Day ${day}: Recovery phase — Acme payment collected, restoring cash to ₹5.20L and runway to a healthy 140 days. The storm has cleared.`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] shadow-lg z-50">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: ₹{Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

// ─── Graph Modal Content per card ─────────────────────────────────────────────
function GraphModalContent({
  cardId,
  cashFlowData: cfd,
  forecastData: fcd,
  burnRateData: brd,
  runwayData: rwd,
}: {
  cardId: CardId;
  cashFlowData: typeof cashFlowData;
  forecastData: typeof forecastData;
  burnRateData: typeof burnRateData;
  runwayData: typeof runwayData;
}) {
  switch (cardId) {
    case 'balance':
    case 'netcash':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cfd} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            <Line type="monotone" dataKey="inflow"  stroke="#3b82f6" strokeWidth={2} dot={false} name="Inflow" isAnimationActive />
            <Line type="monotone" dataKey="outflow" stroke="#ef4444" strokeWidth={2} dot={false} name="Outflow" isAnimationActive />
            <Line type="monotone" dataKey="net"     stroke="#10b981" strokeWidth={2} dot={false} name="Net" isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      );
    case 'burnrate':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={brd} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="burn" fill="#ef4444" radius={[4, 4, 0, 0]} name="Burn Rate" isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      );
    case 'runway':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rwd} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}d`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="days" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Runway (days)" isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      );
    case 'cashflow':
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={cfd} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            <Line type="monotone" dataKey="inflow"   stroke="#3b82f6" strokeWidth={2} dot={false} name="Inflow" isAnimationActive />
            <Line type="monotone" dataKey="outflow"  stroke="#ef4444" strokeWidth={2} dot={false} name="Outflow" isAnimationActive />
            <Line type="monotone" dataKey="net"      stroke="#10b981" strokeWidth={2} dot={false} name="Net" isAnimationActive />
            <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Forecast" isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      );
    case 'forecast':
    default:
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={fcd} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
            <Area type="monotone" dataKey="p90" fill="#E0F2FE" stroke="none" name="P90" isAnimationActive />
            <Area type="monotone" dataKey="p50" fill="#BAE6FD" stroke="#0284C7" strokeWidth={2} name="P50" isAnimationActive />
            <Area type="monotone" dataKey="p10" fill="#7DD3FC" stroke="none" name="P10" isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      );
  }
}


// ─── Hoverable KPI Card ───────────────────────────────────────────────────────
function KpiCard({
  id, label, value, valueClass, onHover, onClick, isHovered,
}: {
  id: CardId; label: string; value: string; valueClass?: string;
  onHover: (id: CardId | null) => void;
  onClick: (id: CardId) => void;
  isHovered: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-3 cursor-pointer select-none transition-all duration-150 ${
        isHovered
          ? 'border-blue-400 shadow-lg shadow-blue-100 scale-[1.03] ring-2 ring-blue-200'
          : 'border-[#E2E8F0] shadow-sm hover:shadow-md'
      }`}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(id)}
    >
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-base font-black ${valueClass ?? 'text-slate-800'}`}>{value}</p>
      {isHovered && (
        <p className="text-[8px] text-blue-500 font-semibold mt-0.5">Click to expand →</p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { demoMode } = useDemoMode();
  const [showDataIngestion, setShowDataIngestion] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [timelineDay, setTimelineDay] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);

  // Hover + click state for KPI card ↔ ship annotation cross-link
  const [hoveredCard, setHoveredCard] = useState<CardId | null>(null);
  const [openGraphCard, setOpenGraphCard] = useState<CardId | null>(null);

  const { data: summary }         = useSWR(`summary-${ORG_ID}`,   () => fetchSummary(ORG_ID),          { refreshInterval: demoMode ? 1500 : 4000 });
  const { data: forecast90 }      = useSWR(`forecast-90-${ORG_ID}`,() => fetchForecast(ORG_ID, 90),    { refreshInterval: demoMode ? 3000 : 8000 });
  const { data: recommendations } = useSWR(`recs-${ORG_ID}`,      () => fetchRecommendations(ORG_ID),  { refreshInterval: demoMode ? 2000 : 6000 });

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !isLive) {
      interval = setInterval(() => setTimelineDay(p => p >= 90 ? 0 : p + 1), 200);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isPlaying, isLive]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenGraphCard(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Zoom + Pan state for ship canvas ─────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 4.0;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Cursor position relative to canvas centre
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const delta = e.deltaY < 0 ? 1.1 : 0.9; // 10% per tick
    setZoom(prev => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * delta));
      // Adjust pan so zoom is centered on cursor
      const scale = next / prev;
      setPan(p => ({
        x: p.x - offsetX * (scale - 1),
        y: p.y - offsetY * (scale - 1),
      }));
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return; // only pan when zoomed in
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...pan };
    (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({ x: panOriginRef.current.x + dx, y: panOriginRef.current.y + dy });
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    (e.currentTarget as HTMLDivElement).style.cursor = zoom > 1 ? 'grab' : 'default';
  }, [zoom]);

  const resetZoomPan = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const liveIcebergs = [
    { id: 'icb-acme',    label: 'Customer Acme Overdue', severity: 'high' as const, onClick: () => {} },
    { id: 'icb-anomaly', label: 'Unusual Spend',          severity: 'medium' as const, onClick: () => {} },
  ];

  const shipProps = isLive
    ? { cashBalance: summary?.cash_balance ?? 435000, maxCashBalance: 800000, runwayDays: summary?.runway_days ?? 75, forecastVolatility: forecast90?.forecast_confidence_volatility ?? 0.18, shortfallRisk: forecast90?.shortfall_risk ?? 0.15, icebergs: liveIcebergs, anomalySpikes: [], recommendationSummary: recommendations?.[0]?.description || 'Runway stable. Clear Acme outstanding invoice.' }
    : { ...getTimelineData(timelineDay), maxCashBalance: 800000 };

  const gemmaNarrative = getGemmaNarrative(timelineDay, isLive, summary);
  const highlightedAnnotationId = hoveredCard ? CARD_META[hoveredCard]?.annotationId : null;

  // ── Progressive chart data: reveal one data-point per ~15 days of timeline ──
  // In Live mode always show all data. In Timeline mode slice up to the current day.
  const visibleMonths      = isLive ? 6 : Math.max(1, Math.ceil((timelineDay / 90) * 6));
  const visibleForecastPts = isLive ? 4 : Math.max(1, Math.ceil((timelineDay / 90) * 4));

  const visCashFlow  = cashFlowData.slice(0, visibleMonths);
  const visForecast  = forecastData.slice(0, visibleForecastPts);
  const visBurnRate  = burnRateData.slice(0, visibleMonths);
  const visRunway    = runwayData.slice(0, visibleMonths);
  const visNetCash   = netCashData.slice(0, visibleMonths);

  return (
    <div className="flex w-full h-screen bg-[#F0F4F8] overflow-hidden font-sans">

      {/* ── Vertical Nav ── */}
      <div className="w-[64px] h-full bg-white border-r border-[#E2E8F0] flex flex-col items-center py-4 shrink-0 z-30">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-extrabold text-xl mb-8 border border-blue-100 shadow-sm">T</div>
        <div className="flex flex-col gap-6 w-full items-center">
          <button className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-sm"><Home className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"><FileText className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"><CheckSquare className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"><BarChart2 className="w-5 h-5" /></button>
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"><Settings className="w-5 h-5" /></button>
        </div>
      </div>

      {/* ── Right Container ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* ── Header ── */}
        <header className="h-[56px] w-full bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 shrink-0 z-20">
          <span className="text-xl font-bold text-slate-800 tracking-tight">THESEUS - SME Copilot</span>
          <nav className="flex items-center h-full gap-8">
            <button className="text-xs font-bold text-blue-600 border-b-2 border-blue-600 h-full px-1 pt-0.5">Home</button>
            <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors h-full px-1">Dashboard</button>
            <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors h-full px-1">Contacts</button>
          </nav>
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-slate-600"><HelpCircle className="w-5 h-5" /></button>
            <button className="text-slate-400 hover:text-slate-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-100 cursor-pointer">
              <img src="https://ui-avatars.com/api/?name=Sridhar&background=a7f3d0&color=065f46" alt="User" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* ── Workspace ── */}
        <div className="flex-1 flex w-full min-h-0 overflow-hidden bg-[#F0F4F8]">

          {/* ── LEFT PANEL ── */}
          <div className="w-[53%] h-full relative flex flex-col border-r border-[#E2E8F0] bg-white">

            {/* Title overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none bg-gradient-to-b from-white/80 to-transparent">
              <h1 className="text-base font-bold text-slate-800 tracking-tight">Signature Visualization</h1>
              <p className="text-[9px] text-slate-500 font-medium leading-tight">
                Animated · 2D vector of the &apos;THESEUS&apos; Greek galley
              </p>
            </div>

            {/* Canvas — tight pack, zoomable + pannable */}
            <div className="flex-1 flex flex-col items-stretch justify-start overflow-hidden">

              {/* ── Zoomable canvas container ── */}
              <div
                ref={canvasRef}
                className="flex-1 relative overflow-hidden select-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                {/* Transformed inner — ShipView sits here */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                    transformOrigin: 'center center',
                    transition: isPanningRef.current ? 'none' : 'transform 0.12s ease-out',
                    willChange: 'transform',
                  }}
                >
                  <ShipView
                    cashBalance={shipProps.cashBalance}
                    maxCashBalance={shipProps.maxCashBalance}
                    runwayDays={shipProps.runwayDays}
                    forecastVolatility={shipProps.forecastVolatility}
                    shortfallRisk={shipProps.shortfallRisk}
                    icebergs={shipProps.icebergs}
                    islands={[]}
                    anomalySpikes={shipProps.anomalySpikes}
                    recommendationSummary={shipProps.recommendationSummary}
                    showAnnotations={true}
                    loading={false}
                    highlightedCard={highlightedAnnotationId}
                  />
                </div>

                {/* ── Zoom Controls (bottom-right corner of canvas) ── */}
                <div className="absolute bottom-3 right-3 z-20 flex flex-col gap-1 pointer-events-auto">
                  <button
                    onClick={() => setZoom(z => Math.min(MAX_ZOOM, +(z * 1.25).toFixed(2)))}
                    className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-slate-600 text-sm font-bold shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center"
                    title="Zoom in"
                  >+</button>
                  <button
                    onClick={() => setZoom(z => Math.max(MIN_ZOOM, +(z / 1.25).toFixed(2)))}
                    className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-slate-600 text-sm font-bold shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center"
                    title="Zoom out"
                  >−</button>
                  <button
                    onClick={resetZoomPan}
                    className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 text-slate-500 text-[9px] font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
                    title="Reset zoom"
                  >⊙</button>
                </div>

                {/* ── Zoom level badge ── */}
                {zoom !== 1 && (
                  <div className="absolute bottom-3 left-3 z-20 bg-slate-800/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded-md pointer-events-none">
                    {Math.round(zoom * 100)}%
                  </div>
                )}
              </div>

              {/* Gemma Narrative strip — below canvas, no extra padding */}
              <div className="shrink-0 px-4 py-3 bg-white border-t border-[#E2E8F0] flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm mt-0.5">G</div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gemma AI Narrative</h4>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">{gemmaNarrative}</p>
                </div>
              </div>
            </div>

            {/* ── Timeline Bar ── */}
            <div className="h-[68px] w-full bg-white border-t border-[#E2E8F0] flex items-center px-5 shrink-0 gap-4 z-10 shadow-sm">
              {/* Mode toggle */}
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Mode</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/60">
                  <button onClick={() => { setIsLive(true); setIsPlaying(false); }} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${isLive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Live</button>
                  <button onClick={() => setIsLive(false)} className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${!isLive ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Timeline</button>
                </div>
              </div>

              {/* Slider */}
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{isLive ? 'Live metrics feed' : 'Interactive simulation'}</span>
                  <span className="font-mono text-[11px] font-bold text-blue-600">{isLive ? 'Live' : `Day ${timelineDay} / 90`}</span>
                </div>
                <input type="range" min="0" max="90" value={isLive ? 60 : timelineDay} disabled={isLive} onChange={(e) => setTimelineDay(parseInt(e.target.value))} className="w-full accent-blue-500 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" />
              </div>

              {/* Controls */}
              {!isLive && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                  <button onClick={() => { setTimelineDay(0); setIsPlaying(false); }} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="w-[47%] h-full bg-[#F8FAFC] flex flex-col z-20 overflow-hidden">

            <div className="px-5 py-3 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold text-slate-800">Dashboard Components</h2>
              <div className="relative">
                <button onClick={() => setShowDataIngestion(!showDataIngestion)} className="px-2 py-1 bg-white border border-[#E2E8F0] rounded-md text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 flex items-center gap-1.5">
                  More <span className="text-[8px] text-slate-400">▼</span>
                </button>
                {showDataIngestion && (
                  <div className="absolute right-0 top-8 w-60 z-50">
                    <DataIngestion onClose={() => setShowDataIngestion(false)} />
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 pb-4 flex-1 flex flex-col gap-3 overflow-y-auto">
              <div className="grid grid-cols-5 gap-3">

                {/* Charts col */}
                <div className="col-span-3 flex flex-col gap-3">
                  {/* Cash Flow Trend */}
                  <div
                    className={`bg-white rounded-xl border p-3 h-[175px] flex flex-col cursor-pointer select-none transition-all duration-150 ${hoveredCard === 'cashflow' ? 'border-blue-400 shadow-lg shadow-blue-100 ring-2 ring-blue-200' : 'border-[#E2E8F0] shadow-sm hover:shadow-md'}`}
                    onMouseEnter={() => setHoveredCard('cashflow')}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setOpenGraphCard('cashflow')}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-bold text-slate-800">Cash Flow Trend</h3>
                      {hoveredCard === 'cashflow' && <span className="text-[8px] text-blue-500 font-semibold">Click to expand →</span>}
                    </div>
                    <div className="flex-1 relative -ml-5 mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={visCashFlow} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={32} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="plainline" iconSize={10} wrapperStyle={{ fontSize: 8, paddingTop: 6 }} />
                          <Line type="monotone" dataKey="inflow"   stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Inflow" isAnimationActive />
                          <Line type="monotone" dataKey="outflow"  stroke="#ef4444" strokeWidth={1.5} dot={false} name="Outflow" isAnimationActive />
                          <Line type="monotone" dataKey="net"      stroke="#10b981" strokeWidth={1.5} dot={false} name="Net" isAnimationActive />
                          <Line type="monotone" dataKey="forecast" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Forecast" isAnimationActive />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Cash Forecast */}
                  <div
                    className={`bg-white rounded-xl border p-3 h-[175px] flex flex-col cursor-pointer select-none transition-all duration-150 ${hoveredCard === 'forecast' ? 'border-blue-400 shadow-lg shadow-blue-100 ring-2 ring-blue-200' : 'border-[#E2E8F0] shadow-sm hover:shadow-md'}`}
                    onMouseEnter={() => setHoveredCard('forecast')}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => setOpenGraphCard('forecast')}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-bold text-slate-800">Cash Forecast (30/60/90 Days)</h3>
                      {hoveredCard === 'forecast' && <span className="text-[8px] text-blue-500 font-semibold">Click to expand →</span>}
                    </div>
                    <div className="flex-1 relative -ml-5 mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visForecast} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#64748B' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} width={32} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 8, paddingTop: 6 }} />
                          <Area type="monotone" dataKey="p90" fill="#E0F2FE" stroke="none" name="P90" isAnimationActive />
                          <Area type="monotone" dataKey="p50" fill="#BAE6FD" stroke="#0284C7" strokeWidth={2} name="P50" isAnimationActive />
                          <Area type="monotone" dataKey="p10" fill="#7DD3FC" stroke="none" name="P10" isAnimationActive />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* KPI col */}
                <div className="col-span-2 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <KpiCard id="balance"  label="Current Balance" value={formatINR(shipProps.cashBalance)} onHover={setHoveredCard} onClick={setOpenGraphCard} isHovered={hoveredCard === 'balance'} />
                    <KpiCard id="netcash"  label="Net Cash Flow"   value="₹+45K" valueClass="text-emerald-500" onHover={setHoveredCard} onClick={setOpenGraphCard} isHovered={hoveredCard === 'netcash'} />
                    <KpiCard id="burnrate" label="Burn Rate"       value="₹12K/Mo" valueClass="text-rose-500" onHover={setHoveredCard} onClick={setOpenGraphCard} isHovered={hoveredCard === 'burnrate'} />
                    <KpiCard id="runway"   label="Runway"          value={isLive ? '2.5 Months' : `${(shipProps.runwayDays / 30.4).toFixed(1)} Mo`} onHover={setHoveredCard} onClick={setOpenGraphCard} isHovered={hoveredCard === 'runway'} />
                  </div>

                  {/* AI Insights */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3 flex-1 flex flex-col hover:shadow-md transition-shadow">
                    <h3 className="text-xs font-bold text-slate-800 mb-2">AI Insights & Recommendations</h3>
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100 flex-1 flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-rose-800 mb-0.5 uppercase tracking-wider">High actions</p>
                        <p className="text-[10px] text-slate-700 leading-tight">{isLive ? 'How can I improve my cash flow? as vector listlets.' : shipProps.recommendationSummary}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100 flex-1 flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-amber-800 mb-0.5 uppercase tracking-wider">Medium actions</p>
                        <p className="text-[10px] text-slate-700 leading-tight">Innovate your cash flow, now consetational castings, and shatcl recommendations.</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex-1 flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Low actions</p>
                        <p className="text-[10px] text-slate-600 leading-tight">You can crew manage the A recommendations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Chat Panel */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col flex-1 min-h-[180px] hover:shadow-md transition-shadow">
                <div className="p-2.5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-800">AI Chat with Gemma</h3>
                  <div className="flex gap-2"><button className="text-slate-400 hover:text-slate-600 text-xs">⛶</button><button className="text-slate-400 hover:text-slate-600 text-xs">⋯</button></div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/20">
                  <div className="flex justify-end">
                    <div className="bg-blue-50 text-slate-800 rounded-lg rounded-tr-none px-3 py-2 text-[10px] max-w-[80%] border border-blue-100 shadow-sm font-medium">How can I improve my cash flow?</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-slate-200">
                      <img src="https://ui-avatars.com/api/?name=Gemma&background=3b82f6&color=fff" alt="Gemma" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white text-slate-700 rounded-lg rounded-tl-none px-3 py-2 text-[10px] border border-slate-200 shadow-sm leading-relaxed max-w-[85%]">
                      Gemma: I how sandlaah: How can I improve my cash flow? and send a sample response deterministic, referenced to this naurual instortramed. The consentions manage lnajuat actions and helos to inspire the savance monment inatural language my cash flow.
                    </div>
                  </div>
                </div>
                <div className="p-2 px-3 border-t border-[#E2E8F0] flex items-center gap-2.5 bg-white shrink-0">
                  <button className="text-slate-400 hover:text-slate-600"><Paperclip className="w-4 h-4" /></button>
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 text-[11px] text-slate-700 outline-none bg-transparent" />
                  <button className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"><Send className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* RAG Chat Copilot Widget */}
      <RagChatUI orgId={ORG_ID} />

      {/* ── Graph Modal Overlay ── */}
      {openGraphCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setOpenGraphCard(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[540px] max-w-[92vw] p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CARD_META[openGraphCard].color }}
                />
                <h2 className="text-base font-bold text-slate-800">{CARD_META[openGraphCard].label}</h2>
              </div>
              <button
                onClick={() => setOpenGraphCard(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chart */}
            <GraphModalContent
              cardId={openGraphCard}
              cashFlowData={visCashFlow}
              forecastData={visForecast}
              burnRateData={visBurnRate}
              runwayData={visRunway}
            />

            <p className="text-[10px] text-slate-400 text-center mt-3">
               Press <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[9px]">Esc</kbd> or click outside to dismiss
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
