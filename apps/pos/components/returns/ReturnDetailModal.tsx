'use client';

import React from 'react';
import { FileText, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const RestockPackageIcon = ({ className = "w-4 h-4 text-emerald-600" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
    <circle cx="16.5" cy="16.5" r="4.5" fill="#059669" stroke="white" strokeWidth="1.5" />
    <path d="m14.5 16.5 1.2 1.2 2.8-2.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface ModalProps {
  recordData: { record: any; type: 'customer' | 'supplier' } | null;
  onClose: () => void;
}

export default function ReturnDetailModal({ recordData, onClose }: ModalProps) {
  if (!recordData) return null;
  const { record, type } = recordData;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none">{record.return_code} Status & Audit Details</h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">{record.date}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-200 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Client / Wholesaler</span>
              <span className="font-bold text-slate-900 text-xs">
                {type === 'customer' ? record.customer_name : record.supplier_name}
              </span>
              <span className="text-[11px] text-slate-500 font-mono block">
                {record.customer_phone || record.purchase_bill}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-mono block">Ref Invoice / Bill #</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {record.original_invoice || record.purchase_bill}
              </span>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Returned Items Breakdown</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900">
              {record.returned_items || record.items_returned}
            </div>
          </div>

          {/* Status & Condition Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono block">Settlement Method</span>
              <span className="font-bold text-emerald-900 text-xs">
                {record.refund_type || record.settlement_status}
              </span>
            </div>
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
              <span className="text-[10px] font-bold text-blue-800 uppercase font-mono block">Processing Status</span>
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {record.status}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Reason for Return / Defect Note</span>
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 font-medium">
              {record.reason || 'Standard Customer Return / Color Shade Mismatch'}
            </div>
          </div>

          {/* Stock Action */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
            <span className="text-slate-600 font-medium text-xs">Stock Condition Action:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              {record.condition === 'Restocked' ? (
                <>
                  <RestockPackageIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Restocked into Main Inventory</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">Damaged (Moved to Defect Bin #4)</span>
                </>
              )}
            </span>
          </div>

          {/* Total Value */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
            <span className="text-xs text-slate-300 font-sans">Total Return Refund Value:</span>
            <span className="text-base font-bold text-emerald-400">{formatCurrency(record.total_value)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1b3830] text-white font-bold text-xs rounded-xl hover:bg-[#142e27] transition cursor-pointer"
          >
            Close Status Details
          </button>
        </div>
      </div>
    </div>
  );
}
