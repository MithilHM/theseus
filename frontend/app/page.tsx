export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-950 text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
          THESEUS
        </h1>
        <p className="text-xl text-slate-400 text-center max-w-2xl">
          AI-Powered SME Cash Flow Copilot. Navigate the financial seas with confidence.
        </p>
        
        <div className="mt-12 p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center gap-6 hover:border-cyan-900 transition-colors duration-500 cursor-pointer group">
          <div className="w-48 h-48 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center group-hover:border-cyan-500 group-hover:rotate-12 transition-all duration-700">
            <span className="text-6xl">🚢</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
            Your Ship is Ready
          </h2>
          <a 
            href="/dashboard"
            className="px-8 py-3 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)]"
          >
            Enter Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
