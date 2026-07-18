'use client';

import React, { useState } from 'react';

interface Props {
  onClose?: () => void;
}

/**
 * DataIngestion
 * ─────────────
 * Popup panel for uploading bank statements (CSV/PDF) or recording voice notes.
 * Matches the "Data Ingestion" panel shown in the top-right of the reference image.
 * Phase 3 will wire these to the backend onboarding pipeline.
 */
export default function DataIngestion({ onClose }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploaded(file.name);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploaded(file.name);
  };

  return (
    <div className="absolute top-0 right-0 z-50 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-800">Data Ingestion</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Upload drag target */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-3 text-center transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
          }`}
        >
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-[11px] text-slate-500">Drop file or</span>
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.pdf,.xlsx,.xls"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {/* Upload button */}
        <label
          htmlFor="file-upload-btn"
          className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
            <path d="M3 19h18" />
          </svg>
          Upload Statement (CSV/PDF)
        </label>
        <input
          id="file-upload-btn"
          type="file"
          accept=".csv,.pdf,.xlsx,.xls"
          onChange={handleFile}
          className="hidden"
        />

        {/* Uploaded confirmation */}
        {uploaded && (
          <p className="text-[10px] text-emerald-600 bg-emerald-50 rounded px-2 py-1 border border-emerald-200">
            ✓ {uploaded}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[9px] text-slate-400 uppercase font-bold">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Voice note button */}
        <button className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 text-[11px] font-medium transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          Voice Note Transaction
        </button>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Synced 2 min ago · 143 transactions
        </div>
      </div>
    </div>
  );
}
