'use client';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

export default function CartItemList() {
  const { items, updateQuantity, removeItem } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[260px] shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mb-3 shadow-2xs">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h4 className="font-bold text-slate-900 text-sm font-sans">Active Cart is Empty</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1 font-medium leading-relaxed">
          Scan a fabric barcode or click any product from the catalog to start a checkout sale.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col flex-1">
      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-3 bg-slate-50 border-b border-slate-200/80 text-slate-600 font-mono text-[11px] uppercase font-bold tracking-wider">
        <div className="col-span-5">Fabric Item</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[360px]">
        {items.map((item: CartItem) => {
          const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
          return (
            <div key={item.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50/80 transition-colors text-xs">
              {/* Item Info */}
              <div className="col-span-5 flex flex-col min-w-0 pr-2">
                <span className="font-bold text-slate-900 truncate font-sans">{item.name}</span>
                <span className="font-mono text-[10px] text-indigo-600 font-semibold mt-0.5">
                  SKU: {item.sku} • {item.category}
                </span>
              </div>

              {/* Unit Price */}
              <div className="col-span-2 text-right font-mono font-bold text-slate-800">
                {formatCurrency(item.price)}
              </div>

              {/* Quantity Controls */}
              <div className="col-span-2 flex items-center justify-center">
                <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-indigo-600 font-bold transition-all cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-extrabold text-slate-900 w-7 text-center text-xs">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-slate-700 hover:bg-white hover:text-indigo-600 font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Line Total */}
              <div className="col-span-2 text-right font-mono font-black text-slate-900 text-sm">
                {formatCurrency(lineTotal)}
              </div>

              {/* Delete Action */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
