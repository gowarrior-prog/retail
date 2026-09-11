'use client';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

export default function CartItemList() {
  const { items, updateQuantity, setItemDiscount, removeItem } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[250px]">
        <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
        <h4 className="font-bold text-slate-800 text-sm">Active Cart is Empty</h4>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Scan a fabric barcode or click any product from the catalog to start a sale.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase font-semibold">
        <div className="col-span-5">Fabric Item</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1 text-center">Action</div>
      </div>

      {/* Items List */}
      <div className="divide-y divide-slate-100 overflow-y-auto max-h-[350px]">
        {items.map((item) => {
          const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
          return (
            <div key={item.id} className="grid grid-cols-12 items-center px-4 py-2.5 hover:bg-slate-50 text-xs">
              {/* Item Info */}
              <div className="col-span-5 flex flex-col min-w-0 pr-2">
                <span className="font-bold text-slate-900 truncate">{item.name}</span>
                <span className="font-mono text-[10px] text-slate-500">
                  SKU: {item.sku} • {item.category}
                </span>
              </div>

              {/* Unit Price */}
              <div className="col-span-2 text-right font-mono font-semibold text-slate-700">
                {formatCurrency(item.price)}
              </div>

              {/* Quantity Controls */}
              <div className="col-span-2 flex items-center justify-center">
                <div className="flex items-center bg-slate-100 rounded border border-slate-200">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-slate-900 w-6 text-center text-xs">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-200 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Line Total */}
              <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                {formatCurrency(lineTotal)}
              </div>

              {/* Delete Action */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
