'use client';

import React, { useState, useRef } from 'react';
import { uploadInvoicePhoto, getOnboardingJobStatus } from '@/lib/api';

interface PhotoCaptureWidgetProps {
  orgId: number;
  onSuccess?: (results: any) => void;
  onError?: (err: string) => void;
}

export default function PhotoCaptureWidget({ orgId, onSuccess, onError }: PhotoCaptureWidgetProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'preview' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus('preview');
    }
  };

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
          setErrorMsg(job.errors || 'Onboarding photo processing failed.');
          if (onError) onError(job.errors || 'Onboarding photo processing failed.');
        }
      } catch (err) {
        clearInterval(interval);
        setStatus('failed');
        setErrorMsg('Failed to check ingestion job status.');
      }
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setStatus('uploading');
    setProgress(30);

    try {
      const res = await uploadInvoicePhoto(photo, orgId);
      setProgress(60);
      startPolling(res.job_id);
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err.message || 'Failed to upload photo.');
      if (onError) onError(err.message || 'Failed to upload photo.');
    }
  };

  return (
    <div className="w-full space-y-3 bg-white p-4 rounded-xl border border-slate-200">
      <p className="text-xs font-bold text-slate-800">Scan Paper Invoice / Receipt</p>

      {/* Selector/Camera Trigger */}
      {status === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-slate-50/30 p-6 text-center transition-all"
        >
          <div className="flex flex-col items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-xs font-semibold text-blue-600">Capture or Upload Invoice Photo</span>
            <span className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preview state */}
      {status === 'preview' && previewUrl && (
        <div className="space-y-3">
          <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Invoice preview"
              className="object-contain w-full h-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStatus('idle'); setPreviewUrl(null); setPhoto(null); }}
              className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-semibold hover:bg-slate-50 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold transition-colors"
            >
              Analyze Receipt
            </button>
          </div>
        </div>
      )}

      {/* Uploading/Processing */}
      {(status === 'uploading' || status === 'processing' || status === 'completed') && (
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-700 truncate max-w-[70%]">invoice.jpg</span>
            <span className="text-blue-600 font-bold uppercase tracking-wider">
              {status === 'uploading' ? 'Uploading' : status === 'processing' ? 'Extracting details' : 'Completed'}
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
            {status === 'processing' && <span className="animate-pulse">Gemma parsing OCR fields...</span>}
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'failed' && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
          <p className="text-[10px] font-bold text-rose-700">Failed to analyze photo</p>
          <p className="text-[10px] text-rose-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => { setStatus('idle'); setPreviewUrl(null); setPhoto(null); setErrorMsg(''); }}
            className="text-[9px] font-bold text-rose-700 underline hover:text-rose-900"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
