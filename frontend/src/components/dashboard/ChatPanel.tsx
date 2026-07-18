'use client';

import React, { useState, useEffect, useRef } from 'react';
import { askCopilot, askDocumentIntelligence, DocumentCitation } from '@/lib/api';
import VoiceNoteWidget from './VoiceNoteWidget';

interface ChatMessage {
  id: string;
  role: 'user' | 'gemma';
  text: string;
  citations?: DocumentCitation[];
}

interface ChatPanelProps {
  orgId?: number;
  floating?: boolean;
  onClose?: () => void;
}

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Spanish', label: 'Español' },
  { code: 'French', label: 'Français' },
  { code: 'German', label: 'Deutsch' },
  { code: 'Hindi', label: 'हिन्दी' },
  { code: 'Tamil', label: 'தமிழ்' },
];

export default function ChatPanel({ orgId = 1, floating = false, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [useDocIntel, setUseDocIntel] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [language, setLanguage] = useState('English');
  const [activeCitation, setActiveCitation] = useState<DocumentCitation | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load persistent language from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theseus_lang');
    if (saved) setLanguage(saved);

    // Initial greeting
    setMessages([
      {
        id: 'greet',
        role: 'gemma',
        text: 'Hello! I am Gemma, your SME financial copilot. How can I help you navigate your cash flows or analyze documents today?',
      },
    ]);
  }, []);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguage(val);
    localStorage.setItem('theseus_lang', val);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text) return;

    if (!textToSend) setInput('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setShowVoiceRecorder(false);

    try {
      let responseText = '';
      let citations: DocumentCitation[] = [];

      // Append language context suffix if language is not English
      const augmentedQuestion = language !== 'English' 
        ? `${text} (Please respond in ${language})` 
        : text;

      if (useDocIntel) {
        const docRes = await askDocumentIntelligence(orgId, augmentedQuestion);
        responseText = docRes.answer;
        citations = docRes.citations;
      } else {
        const copilotRes = await askCopilot(orgId, augmentedQuestion);
        responseText = copilotRes.answer;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          role: 'gemma',
          text: responseText,
          citations: citations.length > 0 ? citations : undefined,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'gemma',
          text: `Error: ${err.message || 'Failed to get answer from Gemma.'}`,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleVoiceSuccess = (results: any) => {
    // Retrieve transcription or description from voice note worker
    if (results && results.transactions && results.transactions[0]) {
      const tx = results.transactions[0];
      const desc = `I processed a voice note: transaction with ${tx.counterparty_name || 'unknown'} of amount ${tx.amount} (${tx.direction}).`;
      handleSend(desc);
    } else {
      handleSend('Processed voice transaction note.');
    }
  };

  return (
    <div
      className={`${
        floating
          ? 'fixed bottom-4 right-4 w-96 h-[500px] z-50 rounded-2xl shadow-2xl border border-slate-200'
          : 'w-full h-full flex flex-col'
      } flex flex-col bg-white overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            G
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Gemma AI Copilot</p>
            <span className="text-[9px] text-slate-400">Powered by Gemma 12B</span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={language}
            onChange={handleLanguageChange}
            className="text-[9px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 outline-none"
            title="AI Language Selector"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Toggle Document Intelligence */}
          <button
            onClick={() => setUseDocIntel(!useDocIntel)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
              useDocIntel
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            title="Search Uploaded Documents mode"
          >
            Doc Intel
          </button>

          {floating && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold pl-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Message history */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-slate-50/50 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'gemma' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
                G
              </div>
            )}
            <div className="space-y-1.5 max-w-[80%]">
              <div
                className={`px-3.5 py-2 rounded-2xl text-[11px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 border border-slate-250 rounded-tl-sm shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {/* Citations List if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {msg.citations.map((cite, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveCitation(cite)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-[9px] font-medium transition-all"
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                      </svg>
                      Source: {cite.source_name} {cite.page_number ? `(p. ${cite.page_number})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 mt-0.5">
              G
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[9px] text-slate-400 ml-1">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Voice Recorder Overlay inside input drawer */}
      {showVoiceRecorder && (
        <div className="border-t border-slate-100 p-2 bg-slate-50">
          <div className="flex justify-between items-center px-2 pb-1">
            <span className="text-[10px] font-semibold text-slate-600">Voice Transcription Input</span>
            <button
              onClick={() => setShowVoiceRecorder(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕ Close
            </button>
          </div>
          <VoiceNoteWidget orgId={orgId} onSuccess={handleVoiceSuccess} compact={true} />
        </div>
      )}

      {/* Input panel footer */}
      <div className="border-t border-slate-100 px-3 py-2.5 bg-white flex items-center gap-2 shrink-0">
        {/* Voice recorder toggle button */}
        <button
          onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
          className={`p-1.5 rounded-lg border transition-colors ${
            showVoiceRecorder
              ? 'bg-rose-50 border-rose-200 text-rose-500'
              : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }`}
          title="Toggle Voice Note Recording Input"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path d="M19 10v2a7 7 0 01-14 0v-2" />
          </svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={useDocIntel ? 'Search document database...' : 'Ask Gemma about cash flows...'}
          className="flex-1 text-[11px] text-slate-700 placeholder-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-150 outline-none focus:border-blue-400 focus:bg-white transition-all"
        />

        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="p-1.5 rounded-lg bg-blue-500 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-600 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>

      {/* Citation Detail Overlay Modal */}
      {activeCitation && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-11/12 max-h-[80%] flex flex-col border border-slate-200">
            <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-150 bg-slate-50 rounded-t-xl">
              <span className="text-[10px] font-bold text-slate-700">Document Excerpt Citation</span>
              <button
                onClick={() => setActiveCitation(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>File: {activeCitation.source_name}</span>
                {activeCitation.section_label && <span>Section: {activeCitation.section_label}</span>}
              </div>
              <p className="text-[11px] text-slate-700 bg-slate-50 rounded p-3 border border-slate-200 leading-relaxed font-sans select-all">
                "{activeCitation.excerpt}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
