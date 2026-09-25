'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, CreditCard } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

interface SplitBillModalProps {
  onClose: () => void;
  onProceedToSplitCheckout: (splitInfo: { cashPart: number; digitalPart: number; digitalMode: string }) => void;
}

export default function SplitBillModal({ onClose, onProceedToSplitCheckout }: SplitBillModalProps) {
  const { grandTotal } = useCartStore();
  const total = grandTotal();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [splitMode, setSplitMode] = useState<'PERSONS' | 'MULTI'>('PERSONS');
  const [numGuests, setNumGuests] = useState<number>(2);

  const guestAmount = numGuests > 0 ? Math.round(total / numGuests) : 0;

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
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
            <Users className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Split Bill & Multi-Tender</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">Terminal Order Split Calculation</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 bg-slate-50 flex flex-col gap-3.5">
          {/* Top Dark Banner */}
          <div className="bg-[#1b3830] text-white rounded-xl p-3.5 flex justify-between items-center shadow-xs">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200 block leading-tight">
                TOTAL BILL TO SPLIT
              </span>
              <span className="text-[10px] text-slate-300 font-medium block">
                Includes all items & taxes
              </span>
            </div>
            <span className="text-xl font-bold font-mono text-emerald-400">
              Rs. {total.toLocaleString()}
            </span>
          </div>

          {/* Split Mode Tabs */}
          <div>
            <label className="text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono mb-1 block">
              SPLIT MODE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSplitMode('PERSONS')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                  splitMode === 'PERSONS'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Split By Persons
              </button>
              <button
                onClick={() => setSplitMode('MULTI')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                  splitMode === 'MULTI'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Multi-Payment (Cash + Card)
              </button>
            </div>
          </div>

          {/* Number of Guests selector */}
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono">
              NUMBER OF GUESTS:
            </label>
            <div className="flex items-center gap-1.5">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNumGuests(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-bold border transition cursor-pointer flex items-center justify-center ${
                    numGuests === n
                      ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Guests List Breakdown */}
          <div className="bg-white border border-slate-300 rounded-xl p-3 space-y-2 max-h-[160px] overflow-y-auto">
            {Array.from({ length: numGuests }).map((_, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#1b3830] text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-800">Guest #{idx + 1}</span>
                </div>
                <span className="text-xs font-bold font-mono text-emerald-800">
                  {formatCurrency(guestAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={handleAnimatedClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onProceedToSplitCheckout({ cashPart: guestAmount, digitalPart: total - guestAmount, digitalMode: 'CARD' });
              handleAnimatedClose();
            }}
            className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center shadow-xs transition cursor-pointer"
          >
            Confirm Split & Pay
          </button>
        </div>
      </div>
    </div>
  );
}
