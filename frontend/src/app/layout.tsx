'use client';

import React, { useState } from 'react';
import "./globals.css";
import ChatPanel from '@/components/dashboard/ChatPanel';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoMode } from '@/lib/demoContext';
import { resetDemoEnvironment } from '@/lib/api';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  // Demo Controls States
  const { demoMode, toggleDemoMode } = useDemoMode();
  const [resetting, setResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleReset = async () => {
    setResetting(true);
    setResetStatus('idle');
    try {
      await resetDemoEnvironment(1);
      setResetStatus('success');
      setTimeout(() => setResetStatus('idle'), 2500);
      // Force trigger refresh on current page
      window.location.reload();
    } catch (err) {
      setResetStatus('error');
      setTimeout(() => setResetStatus('idle'), 2500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <html lang="en" className="h-full antialiased bg-slate-900">
      <body className="min-h-full flex flex-col font-sans select-none bg-slate-900 text-slate-100">
        
        {/* Global Navigation Header */}
        <header className="flex justify-between items-center px-6 py-3 border-b border-slate-800 bg-slate-950 shrink-0 shadow-lg z-40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚢</span>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white">THESEUS</span>
              <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold block -mt-1">SME Cash Flow Copilot</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/"
              className={`transition-colors py-1 px-3 rounded-lg ${
                pathname === '/'
                  ? 'bg-blue-900/40 text-blue-400 border border-blue-800/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ship View
            </Link>
            <Link
              href="/dashboard"
              className={`transition-colors py-1 px-3 rounded-lg ${
                pathname === '/dashboard'
                  ? 'bg-blue-900/40 text-blue-400 border border-blue-800/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </Link>
          </nav>

          {/* Right Header: Demo & Chat Controls */}
          <div className="flex items-center gap-3">
            
            {/* Speed Demo Toggle */}
            <button
              onClick={() => toggleDemoMode(!demoMode)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                demoMode
                  ? 'bg-cyan-900/40 border-cyan-400 text-cyan-400 shadow-md shadow-cyan-950/20'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-300'
              }`}
              title="Visibly speed up the daily simulated feed refresh rate"
            >
              <span>⚡</span>
              <span>{demoMode ? 'Demo Active' : 'Speed Demo'}</span>
            </button>

            {/* Dev Purge DB reset */}
            <button
              onClick={handleReset}
              disabled={resetting}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                resetStatus === 'success'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                  : resetStatus === 'error'
                  ? 'bg-rose-950 border-rose-500 text-rose-400'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-300 disabled:opacity-50'
              }`}
            >
              {resetting ? 'Resetting...' : resetStatus === 'success' ? '✓ Seeded!' : 'Reset Demo'}
            </button>

            {/* Gemma Chat trigger */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                chatOpen
                  ? 'bg-blue-900/40 border-blue-400 text-blue-400'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Gemma Chat
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 relative">
          {children}
        </main>

        {/* Floating Chat Panel */}
        {chatOpen && (
          <ChatPanel
            orgId={1}
            floating={true}
            onClose={() => setChatOpen(false)}
          />
        )}
      </body>
    </html>
  );
}
