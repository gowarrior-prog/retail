'use client';

import { Scissors } from 'lucide-react';

export default function CatalogBottomCutTool() {
  return (
    <div className="bg-blue-50/60 border border-blue-100/90 rounded-2xl p-3.5 flex items-center justify-between font-sans shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#1b3830] text-emerald-300 flex items-center justify-center font-bold text-sm shadow-2xs">
          📏
        </div>
        <div>
          <h4 className="font-extrabold text-slate-800 text-xs leading-none">Quick Metric Custom Cut Tool</h4>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Press <strong className="font-mono text-slate-700 font-bold">[F8]</strong> to open live decimal yardage and meter cut counter for loose bolts.
          </p>
        </div>
      </div>

      <button className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow transition-all cursor-pointer">
        <Scissors className="w-3.5 h-3.5 text-emerald-400" />
        <span>Open Cut Terminal</span>
      </button>
    </div>
  );
}
