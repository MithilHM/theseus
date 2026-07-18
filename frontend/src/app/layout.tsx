import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatPanel from '@/components/dashboard/ChatPanel';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoMode } from '@/lib/demoContext';
import { resetDemoEnvironment } from '@/lib/api';
import React, { useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THESEUS",
  description: "SME Cash Flow Copilot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  // Removed usePathname here since we might want to simplify the navbar to avoid "use client" in layout if possible, 
  // but wait, we need "use client" for state. Let's make this file a client component or extract the nav.
  // Actually, I'll just keep it simple and add 'use client' at the top.
  return (
    <html lang="en" className="h-full antialiased bg-[#EAF6FF]">
      <body className="min-h-full flex flex-col font-sans select-none bg-[#EAF6FF] text-slate-800">
        <main className="flex-1 min-h-0 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
