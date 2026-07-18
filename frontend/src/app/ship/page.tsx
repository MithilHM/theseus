'use client';

import React, { useState } from 'react';
import ShipView from '@/components/ship/ShipView';
import { mockShipData } from '@/lib/mockShipData';
import { ShipViewProps } from '@/types/ship';

/**
 * /ship — Standalone demo page for the ShipView visualization.
 *
 * Includes a control panel so you can tweak props in real-time and immediately
 * see how the ship, water, clouds, and captain respond — useful for demos and
 * Phase 3 wiring.
 */
export default function ShipPage() {
  const [props, setProps] = useState<ShipViewProps>(mockShipData);

  const update = (patch: Partial<ShipViewProps>) =>
    setProps((prev) => ({ ...prev, ...patch }));

  const triggerCaptain = () =>
    update({
      recommendationSummary: `Action updated at ${new Date().toLocaleTimeString()}`,
    });

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col">
      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚢</span>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              THESEUS{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Ship View
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              Financial navigation · interactive visualization
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href="/dashboard"
            className="px-4 py-2 text-xs font-semibold text-slate-300 border border-slate-700 rounded-lg hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
          >
            ← Dashboard
          </a>
        </div>
      </header>

      {/* ── Ship visualization ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col xl:flex-row gap-0">
        {/* Main canvas */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
          <ShipView {...props} />

          {/* Instruction hint overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-mono text-center pointer-events-none">
            Click icebergs, islands, and the water to explore financial events
          </div>
        </div>

        {/* ── Control panel (right sidebar on xl screens) ────────────── */}
        <aside className="xl:w-80 bg-slate-950/80 border-l border-slate-800/60 p-5 space-y-5 backdrop-blur-sm overflow-y-auto">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Live Props — Demo Controls
          </p>

          {/* Cash Balance */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-mono flex justify-between">
              <span>cashBalance</span>
              <span className="text-cyan-400">${props.cashBalance.toLocaleString()}</span>
            </label>
            <input
              type="range"
              min={0}
              max={200000}
              step={1000}
              value={props.cashBalance}
              onChange={(e) => update({ cashBalance: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Runway Days */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-mono flex justify-between">
              <span>runwayDays</span>
              <span className="text-violet-400">{props.runwayDays}d</span>
            </label>
            <input
              type="range"
              min={0}
              max={365}
              step={5}
              value={props.runwayDays}
              onChange={(e) => update({ runwayDays: Number(e.target.value) })}
              className="w-full accent-violet-400"
            />
          </div>

          {/* Forecast Volatility */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-mono flex justify-between">
              <span>forecastVolatility</span>
              <span className="text-amber-400">{props.forecastVolatility.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.forecastVolatility}
              onChange={(e) => update({ forecastVolatility: Number(e.target.value) })}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Shortfall Risk */}
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-mono flex justify-between">
              <span>shortfallRisk</span>
              <span className="text-rose-400">{props.shortfallRisk.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={props.shortfallRisk}
              onChange={(e) => update({ shortfallRisk: Number(e.target.value) })}
              className="w-full accent-rose-400"
            />
          </div>

          {/* Captain Trigger */}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-mono">
              recommendationSummary
            </p>
            <p className="text-[11px] text-slate-300 bg-slate-900 rounded p-2 mb-2 border border-slate-800 font-mono leading-relaxed">
              {props.recommendationSummary}
            </p>
            <button
              onClick={triggerCaptain}
              className="w-full py-2 px-4 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            >
              ⚓ Trigger Captain Reaction
            </button>
          </div>

          {/* Metric legend */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Legend
            </p>
            {[
              { color: 'bg-cyan-400', label: 'Water level → Cash balance' },
              { color: 'bg-violet-400', label: 'Ship height → Runway' },
              { color: 'bg-amber-400', label: 'Wave turbulence → Volatility' },
              { color: 'bg-slate-500', label: 'Storm clouds → Shortfall risk' },
              { color: 'bg-rose-400', label: 'Iceberg HIGH severity' },
              { color: 'bg-yellow-400', label: 'Iceberg MEDIUM severity' },
              { color: 'bg-cyan-300', label: 'Iceberg LOW severity' },
              { color: 'bg-orange-400', label: 'Wave spike → Anomaly' },
              { color: 'bg-green-500', label: 'Lighthouse → Goal / Port' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
