export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8">
      <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-cyan-500">THESEUS</span> Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="text-sm font-medium">SME</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Placeholder metric cards */}
        {['Cash Balance', 'Monthly Revenue', 'Monthly Expenses', 'Runway'].map((metric, i) => (
          <div key={metric} className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <h3 className="text-slate-400 text-sm font-medium mb-2">{metric}</h3>
            <p className="text-3xl font-semibold text-white">
              {i === 3 ? '8 Months' : `$${(Math.random() * 100000).toFixed(2)}`}
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className={i === 2 ? 'text-red-400' : 'text-emerald-400'}>
                {i === 2 ? '↑' : '↑'} {(Math.random() * 15).toFixed(1)}%
              </span>
              <span className="text-slate-500">vs last month</span>
            </div>
          </div>
        ))}

        {/* Main chart area placeholder */}
        <div className="col-span-1 md:grid-cols-2 xl:col-span-3 bg-slate-900 p-6 rounded-xl border border-slate-800 min-h-[400px] flex items-center justify-center">
          <p className="text-slate-500 italic">Cash Flow Forecast Chart (Coming Soon)</p>
        </div>

        {/* Copilot area placeholder */}
        <div className="col-span-1 bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4">Copilot Insights</h2>
          <div className="flex-1 border border-slate-800 rounded-lg bg-slate-950 p-4 flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm">
              <span className="text-cyan-400 font-medium mb-1 block">Course of Action Agent</span>
              Consider delaying the server upgrade by 2 weeks to maintain optimal liquidity buffer.
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm">
              <span className="text-emerald-400 font-medium mb-1 block">Analytics Agent</span>
              Revenue is tracking 12% above forecast for Q3.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
