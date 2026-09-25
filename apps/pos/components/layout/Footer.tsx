'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between shadow-2xs shrink-0 select-none font-sans z-30">
      <div className="flex items-center gap-3 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700">DB Connected</span>
        </div>
        <span className="text-slate-300">•</span>
        <span className="text-slate-600 font-medium">Barcode Scanner Ready</span>
        <span className="text-slate-300">•</span>
        <span className="font-mono text-slate-500">REG-04</span>
        <span className="text-slate-300">•</span>
        <span className="font-mono text-slate-500">POS/2026/09/0017</span>
      </div>

      <div className="flex items-center gap-4 text-[11.5px] text-slate-500 font-medium">
        <span className="hover:text-slate-800 cursor-pointer">
          <strong className="font-mono text-slate-700 font-semibold">[Enter]</strong> Pay
        </span>
        <span className="hover:text-slate-800 cursor-pointer">
          <strong className="font-mono text-slate-700 font-semibold">[Esc]</strong> Cancel
        </span>
      </div>
    </footer>
  );
}
