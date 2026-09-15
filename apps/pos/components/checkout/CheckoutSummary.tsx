'use client';
import { useState } from 'react';
import { Receipt, Percent, Tag } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

export default function CheckoutSummary() {
  const {
    items,
    subtotal,
    discountTotal,
    grandTotal,
    totalProfit,
    globalDiscount,
    setGlobalDiscount,
  } = useCartStore();

  const itemCount = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900 text-sm font-sans">Checkout Summary</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
          {itemCount} Items
        </span>
      </div>

      {/* Prominent Grand Total Display */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono">
          <span className="flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-amber-400" /> Payable Total
          </span>
          <span className="text-slate-400">PKR</span>
        </div>
        <div className="font-mono text-3xl font-black tracking-tight text-right text-white">
          {formatCurrency(grandTotal())}
        </div>
      </div>

      {/* Breakdown Lines */}
      <div className="flex flex-col gap-2 text-xs border-b border-slate-100 pb-3">
        <div className="flex justify-between items-center text-slate-600 font-medium">
          <span>Subtotal ({itemCount} items)</span>
          <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal())}</span>
        </div>

        {discountTotal() > 0 && (
          <div className="flex justify-between items-center text-emerald-600 font-semibold">
            <div className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              <span>Discount</span>
            </div>
            <span className="font-mono font-bold">-{formatCurrency(discountTotal())}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-slate-500 pt-1 text-[11px] font-medium">
          <span>Estimated Profit</span>
          <span className="font-mono font-bold text-slate-700">{formatCurrency(totalProfit())}</span>
        </div>
      </div>
    </div>
  );
}
