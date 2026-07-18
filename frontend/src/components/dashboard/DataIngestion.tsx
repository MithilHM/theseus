'use client';

import React, { useState } from 'react';
import UploadWidget from './UploadWidget';
import PhotoCaptureWidget from './PhotoCaptureWidget';
import VoiceNoteWidget from './VoiceNoteWidget';
import { resetDemoEnvironment } from '@/lib/api';

interface Props {
  onClose?: () => void;
}

type TabType = 'upload' | 'photo' | 'voice' | 'reset';

export default function DataIngestion({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [message, setMessage] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleResetDemo = async () => {
    setResetting(true);
    setMessage('');
    try {
      const res = await resetDemoEnvironment(1);
      setMessage(`✓ ${res.message || 'Demo environment reset successfully.'}`);
    } catch (err: any) {
      setMessage(`✕ Error: ${err.message || 'Failed to reset demo.'}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="absolute top-10 right-0 z-50 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950 shrink-0">
        <div>
          <p className="text-xs font-bold text-white uppercase tracking-wider">Ingestion Control Center</p>
          <span className="text-[9px] text-slate-400">Direct injection to Gemma pipeline</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-sm font-bold p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex bg-slate-950/80 border-b border-slate-800 text-[10px] font-semibold">
        <button
          onClick={() => { setActiveTab('upload'); setMessage(''); }}
          className={`flex-1 py-2 text-center border-r border-slate-800 transition-colors ${
            activeTab === 'upload' ? 'bg-slate-900 text-blue-400' : 'text-slate-400 hover:bg-slate-900/50'
          }`}
        >
          Statement
        </button>
        <button
          onClick={() => { setActiveTab('photo'); setMessage(''); }}
          className={`flex-1 py-2 text-center border-r border-slate-800 transition-colors ${
            activeTab === 'photo' ? 'bg-slate-900 text-blue-400' : 'text-slate-400 hover:bg-slate-900/50'
          }`}
        >
          Invoice Scan
        </button>
        <button
          onClick={() => { setActiveTab('voice'); setMessage(''); }}
          className={`flex-1 py-2 text-center border-r border-slate-800 transition-colors ${
            activeTab === 'voice' ? 'bg-slate-900 text-blue-400' : 'text-slate-400 hover:bg-slate-900/50'
          }`}
        >
          Voice Note
        </button>
        <button
          onClick={() => { setActiveTab('reset'); setMessage(''); }}
          className={`flex-1 py-2 text-center transition-colors ${
            activeTab === 'reset' ? 'bg-slate-900 text-rose-400' : 'text-slate-400 hover:bg-slate-900/50'
          }`}
        >
          Reset Demo
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 bg-slate-900 min-h-[220px] text-slate-200">
        
        {activeTab === 'upload' && (
          <UploadWidget
            orgId={1}
            onSuccess={() => setMessage('✓ Bank Statement ingested successfully!')}
            onError={(err) => setMessage(`✕ Upload Failed: ${err}`)}
          />
        )}

        {activeTab === 'photo' && (
          <PhotoCaptureWidget
            orgId={1}
            onSuccess={() => setMessage('✓ Paper invoice scanned and parsed!')}
            onError={(err) => setMessage(`✕ Scan Failed: ${err}`)}
          />
        )}

        {activeTab === 'voice' && (
          <VoiceNoteWidget
            orgId={1}
            onSuccess={() => setMessage('✓ Voice transaction recorded and parsed!')}
            onError={(err) => setMessage(`✕ Voice Failed: ${err}`)}
          />
        )}

        {activeTab === 'reset' && (
          <div className="space-y-4 p-2">
            <p className="text-[10px] leading-relaxed text-slate-400">
              This action will purge all database records for this organization, reset historical feeds, and re-seed 60 days of mock baseline metrics.
            </p>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 text-white font-bold rounded-lg text-[10px] transition-colors shadow-lg shadow-rose-950/20"
            >
              {resetting ? 'Wiping DB and Re-seeding...' : 'Reset Demo DB (Wipe & Seed)'}
            </button>
          </div>
        )}

        {/* Global info/success message */}
        {message && (
          <div className="mt-3 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-mono leading-relaxed text-slate-300">
            {message}
          </div>
        )}

      </div>
    </div>
  );
}
