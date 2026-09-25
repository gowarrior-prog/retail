'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Banknote, Building2, Smartphone, Receipt } from 'lucide-react';
import { createKhataCustomer } from '@/lib/api';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface ReceivePaymentModalProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceivePaymentModal({ client, onClose, onSuccess }: ReceivePaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const currentDue = client.total_balance || 21700;
  const [paymentAmount, setPaymentAmount] = useState<number>(10000);
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
      await createKhataCustomer({
        customer_name: client.customer_name || client.name,
        phone: client.phone || '0300-0000000',
        initial_balance: newBal,
      });
      playToastAudio('add');
      showCatalogToast(`Received Rs. ${paymentAmount.toLocaleString()} payment from ${client.customer_name || client.name}!`, 'add');
      onSuccess();
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error recording payment'}`);
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
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header matching media_1790341238575.png */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">Receive Payment</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{client.customer_name || client.name} • Main Bazar</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form matching media_1790341238575.png */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Current Outstanding Box */}
          <div className="bg-[#f0f5ff] border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono">
                CURRENT OUTSTANDING
              </span>
              <span className="text-xl font-black font-mono text-rose-600">
                Rs. {currentDue.toLocaleString()}
              </span>
            </div>
            <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide">
              Due
            </span>
          </div>

          {/* Payment Amount Input */}
          <div>
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono mb-1.5">
              PAYMENT AMOUNT (RS.)
            </label>
            <input
              type="number"
              required
              min={1}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-[#f0f5ff] border border-blue-100 rounded-xl text-lg font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Shortcut Pills */}
          <div className="flex items-center gap-2">
            {[5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setPaymentAmount(amt)}
                className="px-3 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Rs. {amt.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaymentAmount(currentDue)}
              className="px-3 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer flex-1 text-center truncate"
            >
              Full Clearance (Rs. {currentDue.toLocaleString()})
            </button>
          </div>

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
              REFERENCE / NOTE (OPTIONAL)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Shop assistant Tariq collected..."
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
              disabled={isSubmitting || !paymentAmount}
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
