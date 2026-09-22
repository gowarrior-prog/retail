'use client';

import React from 'react';
import { Wallet, CreditCard, BookOpen, Smartphone } from 'lucide-react';

interface PaymentModeButtonsProps {
  paymentMode: string;
  setPaymentMode: (mode: string) => void;
}

export default function PaymentModeButtons({ paymentMode, setPaymentMode }: PaymentModeButtonsProps) {
  const modes = [
    { id: 'CASH', label: 'Cash', icon: Wallet, color: 'emerald' },
    { id: 'CARD', label: 'Card / POS', icon: CreditCard, color: 'indigo' },
    { id: 'KHATA', label: 'Khata / Credit', icon: BookOpen, color: 'amber' },
    { id: 'DIGITAL', label: 'JazzCash / EasyPaisa', icon: Smartphone, color: 'purple' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {modes.map((m) => {
        const Icon = m.icon;
        const isSelected = paymentMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setPaymentMode(m.id)}
            className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
