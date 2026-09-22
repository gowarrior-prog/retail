'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import ThermalReceiptContent from './ThermalReceiptContent';

interface ThermalReceiptModalProps {
  receiptData: any;
  onClose: () => void;
}

export default function ThermalReceiptModal({ receiptData, onClose }: ThermalReceiptModalProps) {
  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area');
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Receipt - ${receiptData?.invoice_number || ''}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 4px; font-family: monospace; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-bold text-sm">Payment Successful!</h3>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-200 hover:text-white rounded-lg transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[65vh] overflow-y-auto bg-slate-100 flex justify-center">
          <ThermalReceiptContent receiptData={receiptData} />
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer">
            Close
          </button>
          <button onClick={handlePrintReceipt} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-4 h-4" />
            <span>Print Receipt (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
