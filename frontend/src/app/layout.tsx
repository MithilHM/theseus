'use client';

import React, { useState } from 'react';
import "./globals.css";
import ChatPanel from '@/components/dashboard/ChatPanel';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  return (
    <html lang="en" className="h-full antialiased bg-slate-50">
      <body className="min-h-full flex flex-col font-sans select-none">
        
        {/* Global Navigation Header */}
        <header className="flex justify-between items-center px-6 py-3 border-b border-slate-200 bg-white shrink-0 shadow-sm z-40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚢</span>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-slate-800">THESEUS</span>
              <span className="text-[9px] uppercase tracking-wider text-blue-500 font-bold block -mt-1">SME Cash Flow Copilot</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-4 text-xs font-semibold">
            <Link
              href="/"
              className={`transition-colors py-1 px-3 rounded-lg ${
                pathname === '/'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ship View
            </Link>
            <Link
              href="/dashboard"
              className={`transition-colors py-1 px-3 rounded-lg ${
                pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Dashboard
            </Link>
          </nav>

          {/* Right Header: Chat trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 text-xs font-semibold transition-all"
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
