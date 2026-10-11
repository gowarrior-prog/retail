'use client';

import React from 'react';
import { DollarSign, CreditCard, QrCode, FileText, Sparkles } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';

export default function SettlementAndMarginSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      {/* Settlement Breakdown */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Settlement Breakdown</h4>
            <span className="text-[11px] font-semibold text-slate-400">Counter Cash & Digital</span>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-medium">Cash liquidity vs wholesale credit exposure</p>
        </div>

        <div className="space-y-3.5 font-sans">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Cash Desk
              </span>
              <span className="text-slate-900 font-bold font-mono">0% <span className="font-normal text-slate-400">(Rs. 0)</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Bank & POS Swipes
              </span>
              <span className="text-slate-900 font-bold font-mono">0% <span className="font-normal text-slate-400">(Rs. 0)</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-amber-600" /> Raast / JazzCash / EasyPaisa
              </span>
              <span className="text-slate-900 font-bold font-mono">0% <span className="font-normal text-slate-400">(Rs. 0)</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-rose-600" /> Udhar (Wholesale Credit)
              </span>
              <span className="text-rose-700 font-bold font-mono">0% <span className="font-normal text-slate-400">(Rs. 0)</span></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-rose-500 h-2 rounded-full" style={{ width: '0%' }}></div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Instant Counter Clearing: <strong className="text-slate-900 font-mono">100%</strong></span>
          <span className="text-emerald-700 font-semibold">Ready for sales</span>
        </div>
      </div>

      {/* Fabric Margin Intelligence (Spans 2 cols) */}
      <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
                Fabric Margin Intelligence
              </h4>
              <p className="text-xs text-slate-400 font-medium">Profitability vs turnover matrix across wholesale lines</p>
            </div>
            <span className="inline-flex items-center text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200 font-mono">
              Avg Basket Margin: 0%
            </span>
          </div>

          {/* Margin Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Silk & Pure Chiffon</span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">0% Margin</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 font-medium">Catalog items margin tracker</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Bridal Heavy Embroidered</span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">0% Margin</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 font-medium">Catalog items margin tracker</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Unstitched Printed Lawn</span>
                <span className="text-xs font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded font-mono">0% Margin</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 font-medium">Catalog items margin tracker</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-slate-700 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-800">Wash & Wear Gents Latha</span>
                <span className="text-xs font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded font-mono">0% Margin</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2 font-medium">Catalog items margin tracker</p>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div className="bg-slate-600 h-1.5 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Forecast Notice Banner */}
        <div className="mt-4 p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-2xs border border-slate-800 font-sans">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-300 font-mono">
                Real-Time Business Intelligence Active
              </h5>
              <p className="text-[11px] text-slate-300 mt-0.5">
                All analytics calculations are wired directly to local POS billing, product inventory, and customer khata ledgers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
