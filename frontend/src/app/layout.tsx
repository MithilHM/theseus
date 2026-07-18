import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
