'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal dialog box */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold p-1"
            aria-label="Close modal dialog"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 overflow-y-auto max-h-[70vh] text-slate-700 text-[11px] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
