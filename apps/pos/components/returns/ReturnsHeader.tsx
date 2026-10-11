'use client';

import React from 'react';
import { Plus, Download } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { exportToCSV } from '@/lib/utils';

interface ReturnsHeaderProps {
  activeTab: 'customer' | 'supplier';
  onTabChange: (tab: 'customer' | 'supplier') => void;
  customerCount: number;
  supplierCount: number;
  onOpenWorkflow: () => void;
}

export default function ReturnsHeader({
  activeTab,
  onTabChange,
  customerCount,
  supplierCount,
  onOpenWorkflow,
}: ReturnsHeaderProps) {
  return (
    <div className="space-y-3 font-sans">
      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              RETURNS & EXCHANGES MANAGEMENT
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              exportToCSV('returns_and_exchanges_report.csv', ['Return Code', 'Date', 'Customer/Supplier', 'Original Invoice', 'Refund Type', 'Value'], []);
              showCatalogToast('Exported return records to Downloads folder', 'add');
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Records (.csv)</span>
          </button>

          {/* + NEW RETURN BUTTON */}
          <button
            onClick={onOpenWorkflow}
            className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>New Return</span>
          </button>
        </div>
      </div>

      {/* ─── SUB-HEADER TABS SWITCHER ─── */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => onTabChange('customer')}
          className={`pb-2 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'customer'
              ? 'border-[#1b3830] text-[#1b3830] scale-100'
              : 'border-transparent text-slate-500 hover:text-slate-800 scale-98'
          }`}
        >
          <span>Customer Returns</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full transition-transform duration-200 hover:scale-105">
            {customerCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('supplier')}
          className={`pb-2 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border-b-2 ${
            activeTab === 'supplier'
              ? 'border-[#1b3830] text-[#1b3830] scale-100'
              : 'border-transparent text-slate-500 hover:text-slate-800 scale-98'
          }`}
        >
          <span>Supplier Returns</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full transition-transform duration-200 hover:scale-105">
            {supplierCount}
          </span>
        </button>
      </div>
    </div>
  );
}
