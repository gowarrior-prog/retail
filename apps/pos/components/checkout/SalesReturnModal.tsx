'use client';

import React, { useState } from 'react';
import { X, RotateCcw, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import { posSalesReturn } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import SalesReturnItemsList from './SalesReturnItemsList';

export default function SalesReturnModal({ onClose }: { onClose: () => void }) {
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [returnReason, setReturnReason] = useState('Defective / Damaged Fabric');
  const [items, setItems] = useState<any[]>([
    { product_id: 'p1', product_name: 'Gul Ahmed Luxury Printed Lawn', quantity: 1, refund_price: 2500 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const totalRefund = items.reduce((sum, i) => sum + i.quantity * i.refund_price, 0);

  const handleUpdateQty = (idx: number, delta: number) => {
    const updated = [...items];
    const newQty = Math.max(1, updated[idx].quantity + delta);
    updated[idx].quantity = newQty;
    setItems(updated);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleProcessReturn = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await posSalesReturn({
        original_invoice_number: invoiceSearch || `INV-ORIG-${Date.now().toString().slice(-4)}`,
        items,
        refund_amount: totalRefund,
        reason: returnReason,
      });
      setSuccessResult(res);
    } catch (err: any) {
      alert(`Return Notice: ${err.message || 'Error processing sales return'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" /> POS Sales Return & Refund
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {successResult ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            <h4 className="text-base font-bold text-slate-900">Sales Return Processed!</h4>
            <p className="text-xs text-slate-600">Return Voucher: <span className="font-mono font-bold text-slate-900">{successResult.return_invoice}</span></p>
            <p className="text-sm font-bold text-emerald-700 font-mono">Refund Amount: {formatCurrency(totalRefund)}</p>
            <button onClick={onClose} className="mt-2 px-5 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer">Close</button>
          </div>
        ) : (
          <>
            <div className="p-4 flex flex-col gap-3 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Original Invoice #</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Enter Invoice # (e.g. INV-1002)"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason</label>
                <select
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                >
                  <option value="Defective / Damaged Fabric">Defective / Damaged Fabric</option>
                  <option value="Customer Mind Change">Customer Mind Change</option>
                  <option value="Incorrect Size / Pattern">Incorrect Size / Pattern</option>
                </select>
              </div>

              <SalesReturnItemsList items={items} onUpdateQty={handleUpdateQty} onRemoveItem={handleRemoveItem} />

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex justify-between items-center font-mono text-xs">
                <span className="font-bold text-rose-900 font-sans">Total Cash Refund</span>
                <span className="font-bold text-rose-700 text-base">{formatCurrency(totalRefund)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer">Cancel</button>
              <button onClick={handleProcessReturn} disabled={isSubmitting || items.length === 0} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs">
                <span>{isSubmitting ? 'Processing...' : 'Process Refund'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
