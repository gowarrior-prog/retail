'use client';
import { useState } from 'react';
import { Receipt, Percent } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

export default function CheckoutSummary() {
  const {
    items,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    totalProfit,
    globalDiscount,
    setGlobalDiscount,
    taxRate,
    setTaxRate,
  } = useCartStore();

  const [customDiscount, setCustomDiscount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyDiscount = (val: number) => {
    setGlobalDiscount(val);
    setShowCustomInput(false);
  };

  const handleApplyCustom = () => {
    const num = parseFloat(customDiscount);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setGlobalDiscount(num);
      setShowCustomInput(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-700" />
          <span className="font-bold text-slate-900 text-sm">Checkout Summary</span>
        </div>
        <button
          onClick={() => setTaxRate(taxRate === 0 ? 15 : 0)}
          className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border transition-colors ${
            taxRate > 0
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {taxRate > 0 ? 'GST 15% Active' : 'No Tax'}
        </button>
      </div>

      {/* Prominent Grand Total Display */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col gap-0.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
          <span>Grand Total Due</span>
          <span>PKR</span>
        </div>
        <div className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight text-right">
          {formatCurrency(grandTotal())}
        </div>
      </div>

      {/* Breakdown Lines */}
      <div className="flex flex-col gap-1.5 text-xs border-b border-slate-200 pb-2.5">
        <div className="flex justify-between items-center text-slate-600">
          <span>Subtotal ({itemCount} items)</span>
          <span className="font-mono font-semibold text-slate-900">{formatCurrency(subtotal())}</span>
        </div>

        {discountTotal() > 0 && (
          <div className="flex justify-between items-center text-emerald-700 font-medium">
            <div className="flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              <span>Discount</span>
            </div>
            <span className="font-mono font-bold">-{formatCurrency(discountTotal())}</span>
          </div>
        )}

        {taxRate > 0 && (
          <div className="flex justify-between items-center text-slate-600">
            <span>Sales Tax (GST 15%)</span>
            <span className="font-mono font-semibold text-slate-900">{formatCurrency(taxTotal())}</span>
          </div>
        )}

        <div className="flex justify-between items-center text-slate-500 pt-1 text-[11px]">
          <span>Estimated Cashier Profit</span>
          <span className="font-mono font-bold text-slate-700">{formatCurrency(totalProfit())}</span>
        </div>
      </div>

      {/* Quick Discount Chips */}
      <div>
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">
          Global Discount
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 5, 10, 15, 20].map((d) => (
            <button
              key={d}
              onClick={() => handleApplyDiscount(d)}
              className={`py-1.5 rounded text-xs font-mono font-semibold border transition-colors ${
                globalDiscount === d
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {d === 0 ? 'None' : `${d}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
