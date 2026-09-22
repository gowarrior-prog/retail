'use client';

import React, { useState } from 'react';
import { X, Layers, Clock, RotateCcw, Trash2, ShoppingCart, Download, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { syncOdooBilling } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface HoldOrdersModalProps {
  onClose: () => void;
}

export default function HoldOrdersModal({ onClose }: HoldOrdersModalProps) {
  const { heldBills, restoreHeldOrder, deleteHeldOrder } = useCartStore();
  const [isSyncingOdoo, setIsSyncingOdoo] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleRestore = (id: string) => {
    restoreHeldOrder(id);
    onClose();
  };

  const handleSyncOdooBillingOrders = async () => {
    setIsSyncingOdoo(true);
    setSyncNotice(null);
    try {
      const res = await syncOdooBilling();
      setSyncNotice(res.message || 'Successfully synced sales history & invoices from Odoo ERP!');
    } catch (err: any) {
      setSyncNotice(`Sync Notice: ${err.message || 'Odoo offline'}`);
    } finally {
      setIsSyncingOdoo(false);
    }
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
              <h3 className="font-bold text-slate-900 text-sm">Order History & Parked Bills</h3>
              <p className="text-[11px] text-slate-500 font-medium">Manage held carts & sync Odoo sales order history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Odoo Orders Toolbar Banner */}
        <div className="p-3 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-semibold">
            <Download className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Sync Shop Order History:</span>
          </div>
          <button
            onClick={handleSyncOdooBillingOrders}
            disabled={isSyncingOdoo}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
          >
            <Download className={`w-3.5 h-3.5 ${isSyncingOdoo ? 'animate-bounce' : ''}`} />
            <span>{isSyncingOdoo ? 'Syncing Odoo...' : 'Sync Odoo Orders'}</span>
          </button>
        </div>

        {syncNotice && (
          <div className="px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border-b border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-4 max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
          {heldBills.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <ShoppingCart className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Held Carts Currently</p>
              <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                Click "Sync Odoo Orders" above to import historic sales, or park orders via "Hold / Bill" button.
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
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatCurrency(h.total)}
                  </span>
                  <button
                    onClick={() => handleRestore(h.id)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                  <button
                    onClick={() => deleteHeldOrder(h.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
