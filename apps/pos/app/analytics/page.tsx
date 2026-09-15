'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Receipt, Wallet, RefreshCw, X, TrendingUp, DollarSign } from 'lucide-react';
import { fetchBillingHistory } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [billingRecords, setBillingRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBillingHistory();
      setBillingRecords(data || []);
    } catch (err) {
      console.error('Failed to load billing history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const totalRevenue = billingRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalOrders = billingRecords.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <BarChart3 className="w-5.5 h-5.5 text-indigo-600" />
            Sales & Billing Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Monitor revenue metrics, order volumes, and invoice details
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Receipt className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Orders Completed</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">{totalOrders}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Average Order Value (AOV)</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{formatCurrency(avgOrderValue)}</span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            Billing History Invoices
          </span>
          <span className="font-mono text-xs font-bold text-slate-500">{billingRecords.length} Invoices</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">Fetching billing records...</div>
        ) : billingRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            No checkout transactions recorded yet. Complete a sale in POS to view invoice history.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Client / Phone</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3">Cashier</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-right">Timestamp</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {billingRecords.map((r, idx) => (
                  <tr key={r.id || `inv-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{r.invoice_number}</td>
                    <td className="p-3 font-sans font-medium">{r.customer_phone || 'Walk-in Client'}</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                        {r.payment_mode}
                      </span>
                    </td>
                    <td className="p-3 font-sans">{r.cashier_name || 'Cashier'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(r.total_amount || 0)}</td>
                    <td className="p-3 text-right text-slate-500 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Invoice Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm font-mono">
                Invoice Details: {selectedRecord.invoice_number}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono flex flex-col gap-2 text-slate-700">
              <div className="flex justify-between">
                <span>Client / Phone:</span>
                <span className="font-bold text-slate-900">{selectedRecord.customer_phone || 'Walk-in Client'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-indigo-600">{selectedRecord.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(selectedRecord.total_amount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount Total:</span>
                <span>{formatCurrency(selectedRecord.discount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax:</span>
                <span>{formatCurrency(selectedRecord.tax || 0)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
