'use client';

import React, { useState } from 'react';
import { X, GitFork, Check, Wallet, CreditCard } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

interface SplitBillModalProps {
  onClose: () => void;
  onProceedToSplitCheckout: (splitInfo: { cashPart: number; digitalPart: number; digitalMode: string }) => void;
}

export default function SplitBillModal({ onClose, onProceedToSplitCheckout }: SplitBillModalProps) {
  const { grandTotal } = useCartStore();
  const total = grandTotal();

  const [cashPart, setCashPart] = useState<number>(Math.round(total / 2));
  const [digitalMode, setDigitalMode] = useState<string>('CARD'); // CARD, JAZZCASH, BANK

  const digitalPart = Math.max(0, total - cashPart);

  const handleCashChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setCashPart(Math.min(total, Math.max(0, num)));
  };

  const handleEqualSplit = () => {
    setCashPart(Math.round(total / 2));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Split Payment Bill</h3>
              <p className="text-[11px] text-slate-500 font-medium">Split total between Cash & Digital (Card/Jazz)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4">
          {/* Total Payable Display */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex justify-between items-center shadow-xs">
            <span className="text-xs font-bold text-slate-300">TOTAL BILL AMOUNT:</span>
            <span className="text-xl font-black font-mono text-emerald-400">Rs. {total.toLocaleString()}</span>
          </div>

          {/* Quick Split Option */}
          <div className="flex gap-2">
            <button
              onClick={handleEqualSplit}
              className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition cursor-pointer text-center"
            >
              50% Cash + 50% Digital
            </button>
          </div>

          {/* Portion 1: Cash */}
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-700" /> 1. Cash Payment Portion:
              </span>
              <span className="font-mono">Rs. {cashPart.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 font-mono">Rs.</span>
              <input
                type="number"
                min="0"
                max={total}
                value={cashPart}
                onChange={(e) => handleCashChange(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Portion 2: Digital (Card / Jazz / Bank) */}
          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-700" /> 2. Remaining Digital Portion:
              </span>
              <span className="font-mono font-black text-sm text-blue-800">Rs. {digitalPart.toLocaleString()}</span>
            </div>

            {/* Selector for digital mode */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'CARD', label: 'Card (POS)' },
                { id: 'JAZZCASH', label: 'JazzCash' },
                { id: 'BANK', label: 'Bank Transfer' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setDigitalMode(m.id)}
                  className={`py-1 px-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer text-center ${
                    digitalMode === m.id
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onProceedToSplitCheckout({
                cashPart,
                digitalPart,
                digitalMode,
              });
              onClose();
            }}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Split & Pay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
