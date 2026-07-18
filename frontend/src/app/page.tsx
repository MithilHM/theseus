'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import ShipView from '@/components/ship/ShipView';
import Modal from '@/components/dashboard/Modal';
import { useDemoMode } from '@/lib/demoContext';
import { 
  fetchSummary, 
  fetchForecast, 
  fetchRecommendations, 
  fetchReminderDraft,
  askDocumentIntelligence
} from '@/lib/api';
import DataIngestion from '@/components/dashboard/DataIngestion';
import ScenarioGenerator from '@/components/dashboard/ScenarioGenerator';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const ORG_ID = 1;

const formatINR = (v: number) =>
  v >= 100000
    ? `₹${(v / 100000).toFixed(2)}L`
    : `₹${Math.round(v / 1000)}K`;

const cashFlowData = [
  { month: 'Jan', inflow: 3800, outflow: 3200, net: 600, forecast: null },
  { month: 'Feb', inflow: 4200, outflow: 3600, net: 600, forecast: null },
  { month: 'Mar', inflow: 4000, outflow: 3400, net: 600, forecast: null },
  { month: 'Apr', inflow: 4800, outflow: 3900, net: 900, forecast: null },
  { month: 'May', inflow: 4500, outflow: 4000, net: 500, forecast: 4500 },
  { month: 'June', inflow: 5000, outflow: 4200, net: 800, forecast: 4800 },
];

const forecastData = [
  { label: '0 Days', p10: 43500, p50: 43500, p90: 43500 },
  { label: '30 Days', p10: 45000, p50: 49000, p90: 53000 },
  { label: '60 Days', p10: 55000, p50: 65000, p90: 75000 },
  { label: '90 Days', p10: 70000, p50: 85000, p90: 100000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] shadow-lg z-50">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: ₹{p.value}K</p>
      ))}
    </div>
  );
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

export default function HomePage() {
  const { demoMode } = useDemoMode();
  const [showDataIngestion, setShowDataIngestion] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scenarios'>('dashboard');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: "Hello! I am Gemma, your financial copilot. Ask me questions about your ingested financial statements, burn rate, or runway!" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const q = chatInput.trim();
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: q };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const res = await askDocumentIntelligence(ORG_ID, q);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        citations: res.citations
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error communicating with the intelligence service."
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };
  
  const { data: summary } = useSWR(
    `summary-${ORG_ID}`, 
    () => fetchSummary(ORG_ID), 
    { refreshInterval: demoMode ? 1500 : 4000 }
  );

  const { data: forecast90 } = useSWR(
    `forecast-90-${ORG_ID}`, 
    () => fetchForecast(ORG_ID, 90), 
    { refreshInterval: demoMode ? 3000 : 8000 }
  );

  const { data: recommendations } = useSWR(
    `recs-${ORG_ID}`, 
    () => fetchRecommendations(ORG_ID), 
    { refreshInterval: demoMode ? 2000 : 6000 }
  );

  const computedIcebergs = [
    {
      id: 'icb-acme',
      label: 'Customer Acme Overdue',
      severity: 'high' as const,
      onClick: () => {},
    },
    {
      id: 'icb-anomaly',
      label: 'Unusual Spend',
      severity: 'medium' as const,
      onClick: () => {},
    },
  ];

  return (
    <div className="flex w-full h-screen bg-[#F5F9FC] overflow-hidden font-sans">
      
      {/* ── LEFT PANEL: Ship Visualization ── */}
      <div className="w-[55%] h-full relative flex flex-col border-r border-[#E2E8F0]">
        <div className="absolute top-0 left-0 right-0 z-10 p-6 pointer-events-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Signature Visualization</h1>
          <p className="text-[10px] text-slate-600 font-medium">Animated · 2D vector of the &apos;THESEUS&apos; Greek galley, <br/> Monument Valley</p>
        </div>

        <div className="flex-1 relative overflow-hidden">
          <ShipView
            cashBalance={summary?.cash_balance ?? 435000}
            maxCashBalance={800000}
            runwayDays={summary?.runway_days ?? 75}
            forecastVolatility={forecast90?.forecast_confidence_volatility ?? 0.18}
            shortfallRisk={forecast90?.shortfall_risk ?? 0.15}
            icebergs={computedIcebergs}
            islands={[]}
            anomalySpikes={[]}
            recommendationSummary={recommendations?.[0]?.description || 'Runway stable. Clear Acme outstanding invoice.'}
            showAnnotations={true}
            loading={false}
          />
        </div>
      </div>

      {/* ── RIGHT PANEL: Dashboard & Scenarios ── */}
      <div className="w-[45%] h-full bg-[#F8FAFC] flex flex-col z-20 overflow-y-auto">
        
        {/* Header with Tabs */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-[#E2E8F0] bg-white">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`text-sm font-bold pb-1 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-650 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`text-sm font-bold pb-1 transition-all ${
                activeTab === 'scenarios'
                  ? 'text-blue-650 border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Scenario Simulator
            </button>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowDataIngestion(!showDataIngestion)}
              className="px-3 py-1 bg-white border border-[#E2E8F0] rounded text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Mre
            </button>
            {showDataIngestion && (
              <div className="absolute right-0 top-8 w-56 z-50">
                <DataIngestion onClose={() => setShowDataIngestion(false)} />
              </div>
            )}
          </div>
        </div>

        {activeTab === 'scenarios' ? (
          <div className="flex-1 overflow-y-auto">
            <ScenarioGenerator orgId={ORG_ID} />
          </div>
        ) : (
          /* Dashboard Grid Content */
          <div className="px-6 pb-6 pt-4 flex flex-col gap-4">
          
          <div className="grid grid-cols-5 gap-4">
            
            {/* Charts Column (Left, 3/5 width) */}
            <div className="col-span-3 flex flex-col gap-4">
              
              {/* Cash Flow Trend */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 h-[200px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-800 mb-2">Cash Flow Trend</h3>
                <div className="flex-1 relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cashFlowData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}L`} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="plainline" iconSize={12} wrapperStyle={{ fontSize: 9, paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="inflow" stroke="#4A90E2" strokeWidth={1.5} dot={false} name="Inflow" />
                      <Line type="monotone" dataKey="outflow" stroke="#E11D48" strokeWidth={1.5} dot={false} name="Outflow" />
                      <Line type="monotone" dataKey="net" stroke="#10B981" strokeWidth={1.5} dot={false} name="Net" />
                      <Line type="monotone" dataKey="forecast" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Forecast" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cash Forecast */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 h-[200px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-800 mb-2">Cash Forecast (30/60/90 Days)</h3>
                <div className="flex-1 relative -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} width={35} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 9, paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="p90" fill="#E0F2FE" stroke="none" name="P10/P90" />
                      <Area type="monotone" dataKey="p50" fill="#BAE6FD" stroke="#0284C7" strokeWidth={2} name="P10/P50" />
                      <Area type="monotone" dataKey="p10" fill="#7DD3FC" stroke="none" name="P50/P90" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* KPI Column (Right, 2/5 width) */}
            <div className="col-span-2 flex flex-col gap-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-3">
                  <p className="text-[10px] font-bold text-slate-800 mb-1">Current Balance</p>
                  <p className="text-lg font-black text-slate-800">{formatINR(summary?.cash_balance ?? 435000)}</p>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-3">
                  <p className="text-[10px] font-bold text-slate-800 mb-1">Net Cash Flow</p>
                  <p className="text-base font-bold text-[#10B981]">₹+45K</p>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-3">
                  <p className="text-[10px] font-bold text-slate-800 mb-1">Burn Rate</p>
                  <p className="text-base font-bold text-[#E11D48]">₹12K/Mo</p>
                </div>
                <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-3">
                  <p className="text-[10px] font-bold text-slate-800 mb-1">Runway</p>
                  <p className="text-base font-bold text-slate-800">2.5 Months</p>
                </div>
              </div>

              {/* AI Insights & Recommendations */}
              <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-4 flex-1">
                <h3 className="text-xs font-bold text-slate-800 mb-3">AI Insights & Recommendations</h3>
                <div className="space-y-2">
                  <div className="p-2 rounded bg-[#FEF2F2] border border-[#FEE2E2]">
                    <p className="text-[10px] font-bold text-[#991B1B] mb-0.5">High actions</p>
                    <p className="text-[10px] text-slate-700 leading-tight">How can I improve my cash flow? as vector listlets.</p>
                  </div>
                  <div className="p-2 rounded bg-[#FFF7ED] border border-[#FFEDD5]">
                    <p className="text-[10px] font-bold text-[#9A3412] mb-0.5">Medium actions</p>
                    <p className="text-[10px] text-slate-700 leading-tight">Innovate your cash flow, now consetational castings, and shatcl recommendations.</p>
                  </div>
                  <div className="p-2 rounded bg-[#F8FAFC] border border-[#F1F5F9]">
                    <p className="text-[10px] font-bold text-slate-600 mb-0.5">Low actions</p>
                    <p className="text-[10px] text-slate-600 leading-tight">You can crew manage the A recommendations.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* AI Chat Panel */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm flex flex-col h-[280px]">
            <div className="p-3 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
                  <img src="https://ui-avatars.com/api/?name=Gemma&background=4A90E2&color=fff" alt="Gemma" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-[11px] font-bold text-slate-800">AI Chat with Gemma</h3>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 text-xs">● Live</span>
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0 mt-1">
                      <img src="https://ui-avatars.com/api/?name=Gemma&background=4A90E2&color=fff" alt="Gemma" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`p-2.5 text-[11px] rounded-lg max-w-[85%] border ${
                    msg.role === 'user' 
                      ? 'bg-[#D9EAF7] text-slate-800 border-[#C2DFF2]' 
                      : 'bg-[#F1F5F9] text-slate-700 border-[#E2E8F0]'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-[9px] font-bold text-slate-500 mb-1">SOURCES</p>
                        <ul className="list-disc pl-3 text-[9px] space-y-0.5 opacity-80">
                          {msg.citations.map((cite, idx) => (
                            <li key={idx}>
                              {cite.source_name} {cite.category ? `(${cite.category})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0 mt-1">
                    <img src="https://ui-avatars.com/api/?name=Gemma&background=4A90E2&color=fff" alt="Gemma" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-[#F1F5F9] text-slate-500 rounded-lg p-2.5 text-[11px] border border-[#E2E8F0] flex gap-1 items-center">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#E2E8F0] flex items-center gap-3 bg-white">
              <span className="text-slate-400 text-lg">📎</span>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about your financials..." 
                className="flex-1 text-[11px] outline-none"
              />
              <button 
                onClick={handleSendChat}
                disabled={isChatLoading || !chatInput.trim()}
                className="text-blue-500 hover:text-blue-600 disabled:text-slate-300 disabled:cursor-not-allowed font-bold"
              >
                ➤
              </button>
            </div>
          </div>

        </div>
      )}
      </div>
    </div>
  );
}
