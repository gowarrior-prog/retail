'use client';

import React from 'react';
import { Delete } from 'lucide-react';

interface CartKeypadProps {
  activeMode: 'QTY' | 'DISC' | 'PRICE';
  onKeypadPress: (val: string) => void;
}

export default function CartKeypad({ activeMode, onKeypadPress }: CartKeypadProps) {
  const numBtnClass =
    'bg-white hover:bg-slate-200 active:bg-slate-300 rounded-lg border border-slate-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9';

  const modeBtnClass = (mode: string) =>
    `rounded-lg font-bold text-[10px] sm:text-xs tracking-wider border flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9 ${
      activeMode === mode
        ? 'bg-emerald-600 text-white border-emerald-700'
        : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
    }`;

  const buttons = ['1', '2', '3', 'Qty', '4', '5', '6', 'Disc', '7', '8', '9', 'Price', '+/-', '0', '.', 'DELETE'];

  return (
    <div className="grid grid-cols-4 gap-1 sm:gap-1.5 shrink-0">
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
              className="bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 rounded-lg border border-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9"
              title="Delete / Backspace"
            >
              <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
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
