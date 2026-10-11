'use client';

import React from 'react';
import { Trash2, Check } from 'lucide-react';

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balanceText?: string;
  is_settled?: boolean;
}

interface EmployeeStatementTableProps {
  ledger: LedgerEntry[];
  onDeleteItem: (itemId: string) => void;
}

export default function EmployeeStatementTable({ ledger, onDeleteItem }: EmployeeStatementTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Table Header Label */}
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between font-semibold text-xs text-slate-700 uppercase tracking-wider">
        <span>SALARY & LEDGER STATEMENT</span>
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-[10.5px] uppercase font-semibold text-slate-500">
              <th className="p-3 font-semibold">DATE</th>
              <th className="p-3 font-semibold">TYPE / VOUCHER</th>
              <th className="p-3 font-semibold">DESCRIPTION / DETAILS</th>
              <th className="p-3 text-right font-semibold">EARNED AMOUNT</th>
              <th className="p-3 text-right font-semibold">PAID AMOUNT</th>
              <th className="p-3 text-right font-semibold">BALANCE</th>
              <th className="p-3 text-center w-16 font-semibold">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {ledger && ledger.length > 0 ? (
              ledger.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  {/* Date */}
                  <td className="p-3 font-mono text-slate-500 text-xs">{item.date}</td>

                  {/* Type / Voucher */}
                  <td className="p-3 font-mono font-medium text-slate-800">{item.type}</td>

                  {/* Description */}
                  <td className="p-3 font-medium text-slate-800">{item.description}</td>

                  {/* Earned Amount (Credit) */}
                  <td className="p-3 text-right font-mono font-medium text-slate-800">
                    {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                  </td>

                  {/* Paid Amount (Debit) */}
                  <td className="p-3 text-right font-mono font-medium text-slate-800">
                    {item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                  </td>

                  {/* Balance Status */}
                  <td className="p-3 text-right font-mono">
                    {item.is_settled ? (
                      <div className="flex justify-end">
                        <div className="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-800">
                        {item.balanceText || `Rs. ${item.debit.toLocaleString()} ADVANCE`}
                      </span>
                    )}
                  </td>

                  {/* Delete Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      title="Delete Entry"
                      className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No ledger statement entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
