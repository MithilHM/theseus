'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'gemma';
  text: string;
}

const STARTER_MESSAGES: Message[] = [
  {
    id: 'g1',
    role: 'gemma',
    text: 'Hi! I\'m Gemma, your financial copilot. Ask me anything about your cash flow, risk, or next best action.',
  },
];

const CANNED_RESPONSES: Record<string, string> = {
  default: 'Based on your current cash position and historical patterns, I recommend prioritising the overdue Acme invoice recovery and pre-allocating the GST liability to avoid a penalty.',
  'cash flow': 'Your net cash flow is ₹+45K this month — up 11% from last month driven by Acme milestone clearance. Outflows are stable but the Innovate LLC payment is 20 days overdue.',
  'runway': 'You have approximately 75 days of runway at current burn rate (₹12K/mo). This is below the recommended 90-day buffer. Priority action: recover the Acme overdue invoice.',
  'risk': 'Key risks: (1) Innovate LLC overdue ₹8,200 — severity HIGH. (2) AWS spend spike +28% — anomaly flagged. (3) GST filing due in 7 days — late penalty ₹250.',
  'forecast': 'Monte Carlo forecast shows a narrow confidence band (P10/P90 spread: ₹4K at 90 days), indicating stable, predictable inflows. No shortfall risk in the 90-day window.',
};

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const key of Object.keys(CANNED_RESPONSES)) {
    if (key !== 'default' && lower.includes(key)) {
      return CANNED_RESPONSES[key];
    }
  }
  return CANNED_RESPONSES['default'];
}

/**
 * AIChat
 * ──────
 * Chat panel component replicating the "AI Chat with Gemma" section
 * from the reference PRD image. Accepts pre-seeded messages and 
 * simulates Gemma responses using canned logic (Phase 3 will wire to backend).
 */
export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>(STARTER_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `u${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate Gemma typing delay
    setTimeout(() => {
      const gemmaMsg: Message = {
        id: `g${Date.now()}`,
        role: 'gemma',
        text: getResponse(trimmed),
      };
      setMessages((prev) => [...prev, gemmaMsg]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="flex flex-col h-full bg-white border-t border-slate-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-white">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
          G
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">AI Chat with Gemma</p>
          <p className="text-[10px] text-slate-400">Ask about your finances</p>
        </div>
        {/* Refresh + more icons */}
        <div className="ml-auto flex gap-2 text-slate-400">
          <button className="hover:text-slate-600 transition-colors text-sm">↺</button>
          <button className="hover:text-slate-600 transition-colors text-sm">···</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'gemma' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
                G
              </div>
            )}
            <div
              className={`max-w-[78%] px-3 py-1.5 rounded-2xl text-[11px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-sm'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
              G
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto border-t border-slate-100 bg-white">
        {['Cash flow?', 'Runway?', 'Risk?', 'Forecast?'].map((q) => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            className="shrink-0 px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 text-[10px] font-medium hover:bg-blue-50 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200 bg-white">
        <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 text-[11px] text-slate-700 placeholder-slate-400 bg-transparent outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="shrink-0 text-blue-500 hover:text-blue-700 disabled:text-slate-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
