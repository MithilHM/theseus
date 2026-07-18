'use client';

import React, { useState, useRef } from 'react';
import { uploadStatementFile, getOnboardingJobStatus } from '@/lib/api';

interface UploadWidgetProps {
  orgId: number;
  onSuccess?: (results: any) => void;
  onError?: (err: string) => void;
}

export default function UploadWidget({ orgId, onSuccess, onError }: UploadWidgetProps) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startPolling = async (jobId: string) => {
    setStatus('processing');
    setProgress(75);
    const interval = setInterval(async () => {
      try {
        const job = await getOnboardingJobStatus(jobId);
        if (job.status === 'completed') {
          clearInterval(interval);
          setStatus('completed');
          setProgress(100);
          if (onSuccess) onSuccess(job.results);
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setStatus('failed');
          setErrorMsg(job.errors || 'Onboarding processing pipeline failed.');
          if (onError) onError(job.errors || 'Onboarding processing pipeline failed.');
        }
      } catch (err: any) {
        clearInterval(interval);
        setStatus('failed');
        setErrorMsg('Failed to check ingestion job status.');
      }
    }, 1500);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setErrorMsg('');
    setStatus('uploading');
    setProgress(20);

    try {
      // Simulate fake uploading step progress
      const t = setInterval(() => {
        setProgress((p) => (p < 55 ? p + 8 : p));
      }, 200);

      const res = await uploadStatementFile(file, orgId);
      clearInterval(t);
      startPolling(res.job_id);
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err.message || 'Failed to upload statement file.');
      if (onError) onError(err.message || 'Failed to upload statement file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="w-full space-y-3 bg-white p-4 rounded-xl border border-slate-200">
      <p className="text-xs font-bold text-slate-800">Upload Bank Statement</p>

      {/* Drag & Drop Target */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/30'
          }`}
        >
          <div className="flex flex-col items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs font-semibold text-blue-600">Select or Drag CSV, PDF, or Excel</span>
            <span className="text-[10px] text-slate-400">Statement sizes up to 10MB</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Uploading/Processing Progress Bar */}
      {(status === 'uploading' || status === 'processing' || status === 'completed') && (
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-700 truncate max-w-[70%]">{fileName}</span>
            <span className="text-blue-600 font-bold uppercase tracking-wider">
              {status === 'uploading' ? 'Uploading' : status === 'processing' ? 'Processing (AI)' : 'Completed'}
            </span>
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-slate-400">
            <span>{progress}% finished</span>
            {status === 'processing' && <span className="animate-pulse">Extracting transaction fields...</span>}
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'failed' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
          <p className="text-[10px] font-bold text-rose-700">Failed to process statement</p>
          <p className="text-[10px] text-rose-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => { setStatus('idle'); setProgress(0); setErrorMsg(''); }}
            className="text-[9px] font-bold text-rose-700 underline hover:text-rose-900"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
