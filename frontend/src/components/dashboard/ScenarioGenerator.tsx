import React, { useState } from 'react';
import { simulateScenario } from '@/lib/api';

interface ScenarioGeneratorProps {
  orgId: number;
}

const SAMPLE_SCENARIOS = [
  { id: 1, text: "What if we hire 2 new developers immediately?" },
  { id: 2, text: "What if a major customer delays invoice payment by 60 days?" },
  { id: 3, text: "What if we increase pricing of our core product by 15%?" }
];

export default function ScenarioGenerator({ orgId }: ScenarioGeneratorProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [flowchart, setFlowchart] = useState<any>(null);
  const [description, setDescription] = useState('');

  const handleSelectScenario = async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    setFlowchart(null);
    try {
      const data = await simulateScenario(orgId, id);
      setFlowchart(data.flowchart);
      setDescription(data.description);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Scenario Simulator & Decisions</h2>
        <p className="text-[11px] text-slate-500">Run safe, sandboxed financial projections using real metrics optimized via light context engineering.</p>
      </div>

      {/* Scenarios Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SAMPLE_SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => handleSelectScenario(sc.id)}
            disabled={loading}
            className={`p-3 text-[11px] font-semibold text-left border rounded-lg transition-all shadow-sm ${
              selectedId === sc.id
                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {sc.text}
          </button>
        ))}
      </div>

      {/* Main Sandbox Visualizer */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-y-auto min-h-[300px] flex flex-col justify-center items-center">
        {loading && (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-xs text-slate-500 font-medium">Gemma is drafting future branches...</p>
          </div>
        )}

        {!loading && !flowchart && (
          <div className="text-center space-y-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <p className="text-xs">Select a scenario question above to generate your company's branching financial future.</p>
          </div>
        )}

        {!loading && flowchart && (
          <div className="w-full h-full flex flex-col space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block mb-0.5">Simulation Context</span>
              <p className="text-xs text-slate-700 leading-relaxed font-semibold">{description}</p>
            </div>

            {/* Tree Flowchart Visualizer */}
            <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-6">
              {/* Root Node */}
              {flowchart.nodes.filter((n: any) => n.type === 'root').map((root: any) => (
                <div key={root.id} className="flex flex-col items-center">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg border border-blue-400 shadow-md text-center max-w-sm">
                    <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">Decision Point</span>
                    <p className="text-xs font-bold leading-tight">{root.label}</p>
                    <p className="text-[10px] opacity-90 mt-1 font-mono">{root.metric}</p>
                  </div>
                  {/* Down Arrow Indicator */}
                  <div className="h-6 w-0.5 bg-slate-300 mt-2"></div>
                </div>
              ))}

              {/* Branching Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl relative">
                {/* Horizontal branch divider */}
                <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-slate-300 hidden md:block"></div>

                {flowchart.nodes.filter((n: any) => n.type !== 'root').map((node: any, idx: number) => {
                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  let header = 'Alternative Path';
                  if (node.type === 'success') {
                    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                    header = 'Path A: Growth/Upside';
                  } else if (node.type === 'failure') {
                    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
                    header = 'Path B: Financial Risk';
                  }

                  return (
                    <div key={node.id} className="flex flex-col items-center relative">
                      {/* Vertical line connector */}
                      <div className="h-4 w-0.5 bg-slate-300 -mt-8 hidden md:block"></div>

                      <div className={`p-4 border rounded-xl shadow-md w-full text-center ${badgeColor}`}>
                        <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">{header}</span>
                        <p className="text-xs font-bold leading-snug mt-1">{node.label}</p>
                        <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-white/80 border border-current text-[10px] font-bold font-mono">
                          {node.metric}
                        </div>
                        <div className="mt-2 text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                          Impact: {node.impact_level}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
