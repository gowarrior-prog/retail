'use client';

import React, { useState } from 'react';
import { Printer, X, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import ThermalReceiptContent from './ThermalReceiptContent';
import { generateThermalReceiptHtml } from './ThermalReceiptPrintStyles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ThermalReceiptModal(props: any) {
  const receiptData = props.receiptData || props.receipt || {};
  const onClose = props.onClose || (() => {});
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<string | null>(null);

  const handleDirectPrint = async () => {
    setPrinting(true);
    setPrintResult(null);
    try {
      const res = await fetch(`${API_URL}/printer/print-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiptData),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPrintResult('✅ Bill printed & auto-cut!');
      } else {
        setPrintResult(`❌ ${data.message || 'Print failed'}`);
      }
    } catch (err: any) {
      setPrintResult(`❌ Server error: ${err.message}`);
    } finally {
      setPrinting(false);
      setTimeout(() => setPrintResult(null), 4000);
    }
  };

  const handleBrowserPrint = () => {
    const html = generateThermalReceiptHtml(receiptData);
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm">Payment Successful & Bill Ready</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto bg-slate-100 flex justify-center">
          <ThermalReceiptContent receiptData={receiptData} />
        </div>

        {printResult && (
          <div className={`px-4 py-2 text-center text-xs font-bold ${printResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {printResult}
          </div>
        )}

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition">
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBrowserPrint}
              title="Open browser print dialog"
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-300 cursor-pointer transition flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Browser Print</span>
            </button>

            <button
              onClick={handleDirectPrint}
              disabled={printing}
              className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white rounded-xl font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition disabled:opacity-60"
            >
              {printing ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{printing ? 'Printing...' : 'Direct Print (Auto-Cut)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
