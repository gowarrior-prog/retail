'use client';

import React, { useState, useEffect } from 'react';
import { X, Banknote } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface GiveAdvanceModalProps {
  employee: any;
  onClose: () => void;
  onSuccess: (amount: number, note: string) => void;
}

export default function GiveAdvanceModal({ employee, onClose, onSuccess }: GiveAdvanceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [amount, setAmount] = useState<number>(5000);
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
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      playToastAudio('add');
      showCatalogToast(`Advance Loan Rs. ${amount.toLocaleString()} issued to ${employee.supplier_name}!`, 'add');
      onSuccess(amount, note.trim() || 'Emergency Cash Advance');
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Could not record advance loan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Issue Advance Loan</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">{employee.supplier_name} • {employee.phone}</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-mono flex justify-between">
            <span className="text-slate-600">Current Advance Outstanding:</span>
            <span className="font-bold text-amber-800">Rs. {(employee.advance_due || 0).toLocaleString()}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              ADVANCE AMOUNT (RS) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter advance amount"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              REASON / VOUCHER NOTE
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Emergency cash advance drawn from counter"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Processing...' : 'Issue Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
