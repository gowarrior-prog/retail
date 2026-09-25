'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Trash2, ScanLine } from 'lucide-react';

export default function CatalogToast() {
  const [toast, setToast] = useState<{ message: string; type: 'add' | 'delete' | 'scan' } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    let timer: NodeJS.Timeout;

    const handleToast = (e: any) => {
      if (e.detail) {
        setToast(e.detail);
        clearTimeout(timer);
        timer = setTimeout(() => {
          setToast(null);
        }, 3200);
      }
    };

    window.addEventListener('catalog-toast-event', handleToast);
    return () => {
      window.removeEventListener('catalog-toast-event', handleToast);
      clearTimeout(timer);
    };
  }, []);

  if (!isClient || !toast || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
        animation: 'toastSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
      className="flex items-center gap-3 px-4.5 py-3 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200/90 pointer-events-auto cursor-pointer"
      onClick={() => setToast(null)}
    >
      {toast.type === 'add' ? (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/80">
          <CheckCircle2 className="w-4.5 h-4.5" />
        </div>
      ) : toast.type === 'scan' ? (
        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200/80">
          <ScanLine className="w-4.5 h-4.5" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/80">
          <Trash2 className="w-4.5 h-4.5" />
        </div>
      )}
      <div className="flex flex-col">
        <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold">
          {toast.type === 'add' ? 'Catalog Action' : toast.type === 'scan' ? 'Barcode Scanned' : 'Item Removed'}
        </span>
        <span className="text-xs font-extrabold text-slate-800 tracking-wide">{toast.message}</span>
      </div>
    </div>,
    document.body
  );
}
