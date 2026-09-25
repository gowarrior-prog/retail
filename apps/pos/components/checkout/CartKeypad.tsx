'use client';

import React from 'react';
import { Delete } from 'lucide-react';

interface CartKeypadProps {
  activeMode: 'QTY' | 'DISC' | 'PRICE';
  onKeypadPress: (val: string) => void;
}

export default function CartKeypad({ activeMode, onKeypadPress }: CartKeypadProps) {
  const numBtnClass =
    'bg-white hover:bg-slate-100 active:bg-slate-200 rounded-lg border border-slate-200 text-slate-800 text-sm font-bold flex items-center justify-center cursor-pointer transition-colors select-none py-2';

  const modeBtnClass = (mode: string) =>
    `rounded-lg font-extrabold text-xs tracking-wider border flex items-center justify-center cursor-pointer transition-colors select-none py-2 ${
      activeMode === mode
        ? 'bg-[#1b3830] text-white border-[#153e35]'
        : 'bg-slate-200/90 text-slate-700 border-slate-300 hover:bg-slate-300'
    }`;

  const buttons = ['7', '8', '9', 'Qty', '4', '5', '6', 'Disc', '1', '2', '3', 'Price', '0', '00', '.', 'DELETE'];

  return (
    <div className="grid grid-cols-4 gap-1.5 shrink-0 font-sans">
      {buttons.map((btn) => {
        if (btn === 'Qty' || btn === 'Disc' || btn === 'Price') {
          return (
            <button key={btn} onClick={() => onKeypadPress(btn)} className={modeBtnClass(btn.toUpperCase())}>
              {btn}
            </button>
          );
        }
        if (btn === 'DELETE') {
          return (
            <button
              key={btn}
              onClick={() => onKeypadPress('DELETE')}
              className="bg-slate-200/90 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-lg border border-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors select-none py-2"
              title="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
          );
        }
        return (
          <button key={btn} onClick={() => onKeypadPress(btn)} className={numBtnClass}>
            {btn}
          </button>
        );
      })}
    </div>
  );
}
