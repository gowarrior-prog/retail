'use client';

import React from 'react';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
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
}: CartItemsListProps) {
  return (
    <div className="flex-1 flex flex-col p-4 bg-white min-h-0 overflow-y-auto font-sans">
      {/* Orders Header */}
      <div className="pb-3 flex items-center justify-between border-b border-slate-100 shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Orders</h2>
        {items.length > 0 && (
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            {items.length} item(s)
          </span>
        )}
      </div>

      {/* Cart Content Area */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-[#f4f7f5] border border-[#e2e8e4] flex items-center justify-center mb-3">
              <ShoppingCart className="w-8 h-8" style={{ color: 'rgb(177, 175, 175)' }} />
            </div>
            <p className="text-sm font-bold text-slate-800">Cart is empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">
              Click any product from catalog to add to bill with barcode details
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: CartItem, idx: number) => {
              const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
              const isSelected = selectedItemId === item.id || (idx === 0 && !selectedItemId);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  style={{
                    animation: 'toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 pr-2 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 font-mono">
                      {item.quantity} × <span className="font-semibold text-slate-700">{formatCurrency(item.price)}</span>
                      {item.discount > 0 && <span className="text-emerald-700 ml-1">({item.discount}% off)</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
