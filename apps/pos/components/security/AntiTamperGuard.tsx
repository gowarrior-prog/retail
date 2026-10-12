'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { initDomTamperProtection } from '@/lib/anti-tamper';
import { useCartStore } from '@/stores/useCartStore';

interface TamperAlert {
  id: string;
  target: string;
  attemptedValue: string;
  originalValue: string;
}

export default function AntiTamperGuard() {
  const [alert, setAlert] = useState<TamperAlert | null>(null);

  useEffect(() => {
    // 1. Initialize Global MutationObserver
    const cleanup = initDomTamperProtection((details) => {
      setAlert({
        id: Date.now().toString(),
        target: details.target,
        attemptedValue: details.attemptedValue,
        originalValue: details.originalValue,
      });

      // Enforce Zustand Single Source of Truth
      useCartStore.setState((s) => ({ ...s }));
    });

    // 2. Custom Event Listener
    const handleEvent = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setAlert({
          id: Date.now().toString(),
          target: detail.target,
          attemptedValue: detail.attemptedValue,
          originalValue: detail.originalValue,
        });
      }
    };

    window.addEventListener('dom-tamper-blocked', handleEvent);

    return () => {
      cleanup();
      window.removeEventListener('dom-tamper-blocked', handleEvent);
    };
  }, []);

  // Auto-dismiss alert after 6 seconds
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      setAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-rose-900 border border-rose-500/80 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 select-none backdrop-blur-md">
        <div className="w-8 h-8 rounded-xl bg-rose-800 flex items-center justify-center shrink-0 border border-rose-600">
          <ShieldAlert className="w-5 h-5 text-rose-300 animate-pulse" />
        </div>
        <div className="flex-1 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-white uppercase tracking-wider font-mono text-[11px]">
              Anti-Tamper Guard Active
            </h4>
            <span className="text-[10px] text-rose-300 font-semibold bg-rose-950 px-2 py-0.5 rounded-full border border-rose-700">
              DevTools Blocked
            </span>
          </div>
          <p className="text-rose-100 font-medium leading-relaxed">
            Unauthorized DOM modification attempt on <strong>{alert.target}</strong> was intercepted and <span className="underline decoration-emerald-400 font-bold text-emerald-300">instantaneously reverted</span> to verified state ({alert.originalValue}).
          </p>
          <div className="pt-1 flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Virtual DOM Single-Source-of-Truth Preserved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
