'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Banknote, Building2, Smartphone, Receipt } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface PaySupplierModalProps {
  supplier: any;
  onClose: () => void;
  onSuccess: (info?: any) => void;
}

export default function PaySupplierModal({ supplier, onClose, onSuccess }: PaySupplierModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const currentDue = typeof supplier?.total_balance === 'number' ? Math.max(0, supplier.total_balance) : 0;

  const [paymentAmount, setPaymentAmount] = useState<number>(currentDue);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'DIGITAL'>('CASH');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const newBal = Math.max(0, currentDue - paymentAmount);
      playToastAudio('add');
      showCatalogToast(
        `Paid Rs. ${paymentAmount.toLocaleString()} to Supplier '${supplier.supplier_name}'!`,
        'add'
      );
      onSuccess({ amount: paymentAmount, method: paymentMethod, note, newBalance: newBal });
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error recording supplier payment'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const halfDue = Math.round(currentDue / 2);

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">Pay Supplier / Make Payment</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {supplier.supplier_name} • {supplier.phone || 'No phone'}
              </p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Current Payable Box */}
          <div className="bg-[#f0f5ff] border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono">
                CURRENT PAYABLE TO SUPPLIER
              </span>
              <span className={`text-xl font-black font-mono ${currentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                Rs. {currentDue.toLocaleString()}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                currentDue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {currentDue > 0 ? 'Payable' : 'Cleared'}
            </span>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono mb-1.5">
              PAYMENT AMOUNT (RS)
            </label>
            <input
              type="number"
              required
              min={1}
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount to pay"
              className="w-full px-3.5 py-2.5 bg-[#f0f5ff] border border-blue-100 rounded-xl text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Dynamic Shortcut Pills */}
          {currentDue > 0 && (
            <div className="flex items-center gap-2">
              {halfDue > 0 && halfDue !== currentDue && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(halfDue)}
                  className="px-3 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  50% (Rs. {halfDue.toLocaleString()})
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentAmount(currentDue)}
                className="px-3 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex-1 text-center truncate"
              >
                Full Clearance (Rs. {currentDue.toLocaleString()})
              </button>
            </div>
          )}

          {/* Payment Method Tabs */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono mb-1.5">
              PAYMENT METHOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'BANK', label: 'Bank Transfer', icon: Building2 },
                { id: 'DIGITAL', label: 'JazzCash/EP', icon: Smartphone },
              ].map((m) => {
                const Icon = m.icon;
                const isSel = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSel
                        ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-xs'
                        : 'bg-[#f0f5ff] border-blue-100 text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Note */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono mb-1.5">
              REFERENCE / CHEQUE / RECEIPT # (OPTIONAL)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via HBL Online / Cash handed to agent..."
              className="w-full px-3.5 py-2.5 bg-[#f0f5ff] border border-blue-100 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !paymentAmount || paymentAmount <= 0}
              className="px-5 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
