'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

export default function ProfessionalAlertModal() {
  const [alertData, setAlertData] = useState<{ message: string; title: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const handleAlert = (e: any) => {
      if (e.detail) {
        setAlertData(e.detail);
        setIsClosing(false);
        requestAnimationFrame(() => setIsOpen(true));
      }
    };

    window.addEventListener('professional-alert-event', handleAlert);
    return () => window.removeEventListener('professional-alert-event', handleAlert);
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => {
      setAlertData(null);
      setIsClosing(false);
    }, 250);
  };

  if (!isClient || !alertData || typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-250 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl p-7 shadow-2xl border border-slate-200/90 max-w-md w-full text-center flex flex-col items-center gap-4 relative transition-all duration-250 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        <button
          onClick={handleAnimatedClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200/80 flex items-center justify-center shrink-0">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-1.5 px-2">
          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{alertData.title}</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{alertData.message}</p>
        </div>

        <button
          onClick={handleAnimatedClose}
          className="mt-1 w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-300/80 py-2.5 rounded-xl font-extrabold text-xs shadow-2xs transition-all cursor-pointer"
        >
         Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
