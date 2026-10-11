'use client';

import React from 'react';

export default function SalesProfitTrendChart() {
  return (
    <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
            Sales & Realized Profit Trend
          </h4>
          <p className="text-xs text-slate-400 font-medium">Daily trajectory (PKR in Thousands)</p>
        </div>
        <div className="flex items-center space-x-4 text-xs font-semibold">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            <span className="text-slate-700">Gross Sales</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-400 inline-block"></span>
            <span className="text-slate-700">Net Margin</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-64 select-none flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 p-4">
        <svg className="w-full h-full opacity-60" fill="none" preserveAspectRatio="none" viewBox="0 0 700 240">
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="40" y2="40" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="90" y2="90" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="140" y2="140" />
          <line stroke="#e2e8f0" strokeWidth="1" x1="0" x2="700" y1="190" y2="190" />
          <line stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="700" y1="190" y2="190" />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">No Sales Transactions Recorded</span>
          <span className="text-[11px] text-slate-400 mt-1">Real-time sales trajectory will populate as counter checkouts are processed</span>
        </div>
      </div>

      <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-1 font-mono">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
        <span>Week 4</span>
      </div>
    </div>
  );
}
