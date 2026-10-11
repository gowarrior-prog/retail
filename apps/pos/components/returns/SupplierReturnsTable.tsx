'use client';

import React from 'react';
import { Download, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface SupplierReturnRecord {
  id: string;
  return_code: string;
  date: string;
  supplier_name: string;
  purchase_bill: string;
  items_returned: string;
  total_value: number;
  settlement_status: 'Ledgers Synced' | 'Cash Received';
  reason: string;
  status: 'Completed' | 'Pending Settlement';
}

interface TableProps {
  records: SupplierReturnRecord[];
  onSelectDetail: (rec: SupplierReturnRecord) => void;
  onDeleteRecord: (id: string, code: string) => void;
}

export default function SupplierReturnsTable({ records, onSelectDetail, onDeleteRecord }: TableProps) {
  return (
    <div className="w-full overflow-hidden no-scrollbar font-sans">
      <table className="w-full text-left text-xs font-sans table-fixed">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100/60 text-[10.5px] uppercase font-bold text-slate-500 font-mono">
            <th className="px-3 py-2.5 w-[14%]">DEBIT CODE & DATE</th>
            <th className="px-3 py-2.5 w-[18%]">SUPPLIER / WHOLESALER</th>
            <th className="px-3 py-2.5 w-[12%]">PURCHASE BILL</th>
            <th className="px-3 py-2.5 w-[20%]">ITEMS RETURNED</th>
            <th className="px-3 py-2.5 text-right w-[11%]">TOTAL VALUE</th>
            <th className="px-3 py-2.5 text-center w-[11%]">SETTLEMENT STATUS</th>
            <th className="px-3 py-2.5 w-[11%]">REASON</th>
            <th className="px-3 py-2.5 text-center w-[5%]">STATUS</th>
            <th className="px-3 py-2.5 text-center w-[8%]">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-normal">
          {records.map((rec) => (
            <tr key={rec.id} className="hover:bg-slate-50/90 transition-colors duration-150">
              <td className="px-3 py-2.5">
                <span className="font-mono font-bold text-slate-900 block">{rec.return_code}</span>
                <span className="text-[11px] text-slate-400 font-mono">{rec.date}</span>
              </td>
              <td className="px-3 py-2.5 font-bold text-slate-900">{rec.supplier_name}</td>
              <td className="px-3 py-2.5 font-mono text-slate-800 font-bold">{rec.purchase_bill}</td>
              <td className="px-3 py-2.5 font-medium text-slate-900 max-w-xs truncate">{rec.items_returned}</td>
              <td className="px-3 py-2.5 text-right font-mono font-bold text-[#1b3830] text-sm">
                {formatCurrency(rec.total_value)}
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold inline-block">
                  {rec.settlement_status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-slate-600 font-medium">{rec.reason}</td>
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
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600 font-bold" />
                  )}
                </button>
              </td>
              <td className="px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => window.print()}
                    title="Download Debit Note"
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
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
