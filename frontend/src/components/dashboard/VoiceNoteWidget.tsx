'use client';

import React, { useState, useRef, useEffect } from 'react';
import { uploadVoiceClip, getOnboardingJobStatus } from '@/lib/api';

interface VoiceNoteWidgetProps {
  orgId: number;
  onSuccess?: (results: any) => void;
  onError?: (err: string) => void;
  compact?: boolean;
}

export default function VoiceNoteWidget({ orgId, onSuccess, onError, compact = false }: VoiceNoteWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Waveform visualization elements
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(16).fill(3));

  const startRecording = async () => {
    setErrorMsg('');
    audioChunksRef.current = [];
    setTimeLeft(30);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setStatus('recorded');
        
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setStatus('recording');

      // Countdown Timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Simple voice simulation visualizer
      const updateVisualizer = () => {
        setWaveformBars(() =>
          Array.from({ length: 16 }, () => Math.floor(Math.random() * 20) + 4)
        );
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      updateVisualizer();

    } catch (err: any) {
      setErrorMsg('Microphone access denied or not supported.');
      if (onError) onError('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setWaveformBars(new Array(16).fill(3));
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startPolling = async (jobId: string) => {
    setStatus('processing');
    setProgress(80);
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
          setErrorMsg(job.errors || 'Voice processing failed.');
          if (onError) onError(job.errors || 'Voice processing failed.');
        }
      } catch (err) {
        clearInterval(interval);
        setStatus('failed');
        setErrorMsg('Failed to fetch job status.');
      }
    }, 1500);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setStatus('uploading');
    setProgress(30);

    try {
      const file = new File([audioBlob], 'voicenote.webm', { type: 'audio/webm' });
      const res = await uploadVoiceClip(file, orgId);
      setProgress(60);
      startPolling(res.job_id);
    } catch (err: any) {
      setStatus('failed');
      setErrorMsg(err.message || 'Failed to upload voice recording.');
      if (onError) onError(err.message || 'Failed to upload voice recording.');
    }
  };

  return (
    <div className={`w-full space-y-3 bg-white ${compact ? 'p-1 border-0' : 'p-4 rounded-xl border border-slate-200'}`}>
      {!compact && <p className="text-xs font-bold text-slate-800">Record Voice Transaction</p>}

      {/* Control panel */}
      {status === 'idle' && (
        <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-lg">
          <button
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-105 shadow-md"
            aria-label="Start recording"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 mt-2">Tap to record transaction note (&le;30s)</span>
        </div>
      )}

      {/* Recording Waveform + Timer */}
      {status === 'recording' && (
        <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-rose-600">0:{(timeLeft < 10 ? '0' : '') + timeLeft}s</span>
          </div>

          {/* Waveform Visualization Bars */}
          <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-[200px]">
            {waveformBars.map((height, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-blue-500 transition-all duration-75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <button
            onClick={stopRecording}
            className="px-4 py-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-semibold transition-colors"
          >
            Stop Recording
          </button>
        </div>
      )}

      {/* Recorded Preview state */}
      {status === 'recorded' && (
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
          <p className="text-[10px] font-bold text-slate-700">Voice clip recorded successfully</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setStatus('idle'); setAudioBlob(null); }}
              className="flex-1 py-1 text-center rounded border border-slate-200 text-slate-600 text-[10px] font-semibold hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 py-1 text-center rounded bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-semibold"
            >
              Process Audio
            </button>
          </div>
        </div>
      )}

      {/* Uploading/Processing Progress */}
      {(status === 'uploading' || status === 'processing' || status === 'completed') && (
        <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-semibold text-slate-700">voicenote.webm</span>
            <span className="text-blue-600 font-bold uppercase tracking-wider">
              {status === 'uploading' ? 'Uploading' : status === 'processing' ? 'Transcribing (AI)' : 'Completed'}
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
            {status === 'processing' && <span className="animate-pulse">Transcribing & structuring using Gemma...</span>}
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
          <p className="text-[10px] font-bold text-rose-700">Recording issue</p>
          <p className="text-[10px] text-rose-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => { setStatus('idle'); setErrorMsg(''); setAudioBlob(null); }}
            className="text-[9px] font-bold text-rose-700 underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
