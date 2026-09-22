'use client';

import React from 'react';
import { ShoppingCart, Minus, Plus, Trash2, XCircle, Receipt } from 'lucide-react';
import { type CartItem } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

interface CartItemsListProps {
  items: CartItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export default function CartItemsList({
  items,
  selectedItemId,
  onSelectItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartItemsListProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col p-2.5 sm:p-3 divide-y divide-slate-100 min-h-0">
      {/* Order Header */}
      <div className="flex items-center justify-between pb-2 text-xs text-slate-500 font-medium shrink-0">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Receipt className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-bold text-slate-800">Active Register</span>
        </div>

        <div className="flex items-center gap-1.5">
          {items.length > 0 && (
            <button
              onClick={onClearCart}
              className="px-2 py-0.5 rounded text-[10.5px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1"
              title="Cancel Order & Empty Cart"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10.5px] font-semibold">
            Ready
          </span>
        </div>
      </div>

      {/* Active Cart Items */}
      <div className="py-2 space-y-1.5 flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs">Scan barcode or select items from catalog</p>
          </div>
        ) : (
          items.map((item: CartItem, idx: number) => {
            const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
            const isSelected = selectedItemId === item.id || (idx === 0 && !selectedItemId);
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`p-2 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex-1 pr-2 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{item.name}</h4>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 font-mono">
                    {item.quantity} × <span className="font-semibold text-slate-700">{formatCurrency(item.price)}</span>
                    {item.discount > 0 && <span className="text-emerald-700 ml-1">({item.discount}% off)</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateQuantity(item.id, item.quantity - 1);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold font-mono">{item.quantity}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateQuantity(item.id, item.quantity + 1);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <span className="w-16 text-right text-xs font-bold font-mono text-slate-900">
                    {formatCurrency(lineTotal)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
