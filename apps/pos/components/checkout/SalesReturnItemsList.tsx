'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface SalesReturnItemsListProps {
  items: any[];
  onUpdateQty: (idx: number, delta: number) => void;
  onRemoveItem: (idx: number) => void;
}

export default function SalesReturnItemsList({ items, onUpdateQty, onRemoveItem }: SalesReturnItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400 font-bold">
        No return items selected. Add products from original invoice.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 truncate">{item.product_name}</div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              Refund Unit Price: {formatCurrency(item.refund_price)}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white border border-slate-300 rounded p-0.5">
              <button
                type="button"
                onClick={() => onUpdateQty(idx, -1)}
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded font-bold"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center font-bold font-mono">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQty(idx, 1)}
                className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded font-bold"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <span className="font-mono font-bold text-rose-600 w-20 text-right">
              {formatCurrency(item.quantity * item.refund_price)}
            </span>

            <button
              type="button"
              onClick={() => onRemoveItem(idx)}
              className="p-1 text-slate-400 hover:text-rose-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
