'use client';

import React from 'react';
import { X, Layers, Clock, RotateCcw, Trash2, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

interface HoldOrdersModalProps {
  onClose: () => void;
}

export default function HoldOrdersModal({ onClose }: HoldOrdersModalProps) {
  const { heldBills, restoreHeldOrder, deleteHeldOrder } = useCartStore();

  const handleRestore = (id: string) => {
    restoreHeldOrder(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Parked / Held Orders ({heldBills.length})</h3>
              <p className="text-[11px] text-slate-500 font-medium">Temporarily saved customer carts to resume</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {heldBills.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <ShoppingCart className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Held Orders</p>
              <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                Click "Hold / Bill" in the POS register to park an order while customer shops.
              </p>
            </div>
          ) : (
            heldBills.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{h.id}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {h.timestamp}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                    {h.items.length} item(s): {h.items.map((i) => i.name).slice(0, 2).join(', ')}
                    {h.items.length > 2 ? '...' : ''}
                  </div>
                  {h.orderNote && (
                    <div className="text-[10.5px] text-amber-700 italic font-sans mt-0.5">
                      Note: "{h.orderNote}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    Rs. {h.total.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleRestore(h.id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Restore Order"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => deleteHeldOrder(h.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="Discard Held Order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
