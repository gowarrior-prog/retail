'use client';

import React from 'react';
import { Package, RefreshCw, Plus } from 'lucide-react';

interface InventoryHeaderProps {
  onSyncOdoo: () => void;
  isSyncing: boolean;
  onOpenAddModal: () => void;
}

export default function InventoryHeader({ onSyncOdoo, isSyncing, onOpenAddModal }: InventoryHeaderProps) {
  return (
    <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between font-sans">


      <div className="flex items-center gap-2">
        <button
          onClick={onSyncOdoo}
          disabled={isSyncing}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Odoo Catalog'}</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Fabric Item</span>
        </button>
      </div>
    </div>
  );
}
