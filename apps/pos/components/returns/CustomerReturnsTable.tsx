'use client';

import React from 'react';
import { Printer, Trash2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface CustomerReturnRecord {
  id: string;
  return_code: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  original_invoice: string;
  returned_items: string;
  total_value: number;
  refund_type: 'Cash Refund' | 'Khata Credit' | 'Exchanged';
  exchange_extra?: number;
  condition: 'Restocked' | 'Damaged';
  status: 'Completed' | 'Pending Settlement';
  reason?: string;
}

const RestockPackageIcon = ({ className = "w-4 h-4 text-emerald-600" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
    <circle cx="16.5" cy="16.5" r="4.5" fill="#059669" stroke="white" strokeWidth="1.5" />
    <path d="m14.5 16.5 1.2 1.2 2.8-2.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface TableProps {
  records: CustomerReturnRecord[];
  onSelectDetail: (rec: CustomerReturnRecord) => void;
  onDeleteRecord: (id: string, code: string) => void;
}

export default function CustomerReturnsTable({ records, onSelectDetail, onDeleteRecord }: TableProps) {
  return (
    <div className="w-full overflow-hidden no-scrollbar font-sans">
      <table className="w-full text-left text-xs font-sans table-fixed">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100/60 text-[10.5px] uppercase font-bold text-slate-500 font-mono">
            <th className="px-3 py-2 w-[14%]">RETURN ID & DATE</th>
            <th className="px-3 py-2 w-[18%]">CUSTOMER INFO</th>
            <th className="px-3 py-2 w-[12%]">ORIG. INVOICE</th>
            <th className="px-3 py-2 w-[20%]">RETURNED ITEMS</th>
            <th className="px-3 py-2 text-right w-[11%]">VALUE</th>
            <th className="px-3 py-2 text-center w-[11%]">SETTLEMENT</th>
            <th className="px-3 py-2 text-center w-[5%]">STOCK</th>
            <th className="px-3 py-2 text-center w-[5%]">STATUS</th>
            <th className="px-3 py-2 text-center w-[7%]">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-normal">
          {records.map((rec) => (
            <tr key={rec.id} className="hover:bg-slate-50/90 transition-colors duration-150">
              <td className="px-3 py-2.5">
                <span className="font-mono font-bold text-slate-900 block">{rec.return_code}</span>
                <span className="text-[11px] text-slate-400 font-mono">{rec.date}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="font-bold text-slate-900 block">{rec.customer_name}</span>
                <span className="text-[11px] text-slate-500 font-mono">{rec.customer_phone}</span>
              </td>
              <td className="px-3 py-2.5">
                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-800">
                  {rec.original_invoice}
                </span>
              </td>
              <td className="px-3 py-2.5 max-w-xs">
                <span className="font-medium text-slate-900 block truncate">{rec.returned_items}</span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                {formatCurrency(rec.total_value)}
              </td>
              <td className="px-3 py-2.5 text-center">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                    rec.refund_type === 'Khata Credit'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rec.refund_type === 'Cash Refund'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {rec.refund_type}
                </span>
              </td>
              <td className="px-3 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => onSelectDetail(rec)}
                  title={`Stock Condition: ${rec.condition}`}
                  className={`p-1.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition ${
                    rec.condition === 'Restocked'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-rose-100 text-rose-700 border border-rose-300'
                  }`}
                >
                  {rec.condition === 'Restocked' ? (
                    <RestockPackageIcon className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-700 font-bold" />
                  )}
                </button>
              </td>
              <td className="px-3 py-2.5 text-center">
                <button
                  type="button"
                  onClick={() => onSelectDetail(rec)}
                  title={`Status: ${rec.status}`}
                  className={`p-1.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition ${
                    rec.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-amber-100 text-amber-700 border border-amber-300'
                  }`}
                >
                  {rec.status === 'Completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 font-bold" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600 font-bold" />
                  )}
                </button>
              </td>
              <td className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    title="Print Receipt"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer active:scale-95 transition"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(rec.id, rec.return_code)}
                    title="Delete"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer active:scale-95 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
