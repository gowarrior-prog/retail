'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Receipt, Wallet, RefreshCw, X } from 'lucide-react';
import { fetchBillingHistory } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
      console.error('Failed to load DB3 billing history:', err);
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700" />
            Sales & Billing Analytics (DB3)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Archived Invoices and Financial Reports from Analytics DB
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          disabled={isLoading}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Total Recorded Sales</span>
          <span className="text-2xl font-black font-mono text-slate-900">{formatCurrency(totalRevenue)}</span>
          <span className="text-[11px] text-slate-500">DB3 Billing History</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Total Orders Completed</span>
          <span className="text-2xl font-black font-mono text-slate-900">{totalOrders}</span>
          <span className="text-[11px] text-slate-500">Invoices Processed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Average Order Value (AOV)</span>
          <span className="text-2xl font-black font-mono text-slate-900">{formatCurrency(avgOrderValue)}</span>
          <span className="text-[11px] text-slate-500">Per Customer Sale</span>
        </div>
      </div>

      {/* DB3 Billing Invoices Table (Zero dummy data, clean minimal style) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-700" />
            Billing History Invoices (DB3)
          </span>
          <span className="font-mono text-[11px] text-slate-500">{billingRecords.length} Records</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-mono">Fetching DB3 billing records...</div>
        ) : billingRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No checkout transactions recorded yet. Complete a checkout in POS to archive bills to DB3.
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
                {billingRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{r.invoice_number}</td>
                    <td className="p-3">{r.customer_phone || 'Walk-in Client'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                        {r.payment_mode}
                      </span>
                    </td>
                    <td className="p-3">{r.cashier_name || 'Cashier'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(r.total_amount || 0)}</td>
                    <td className="p-3 text-right text-slate-500 text-[11px]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 shadow-xl border border-slate-200 max-w-lg w-full flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm font-mono">
                Invoice Details: {selectedRecord.invoice_number}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono flex flex-col gap-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Client / Phone:</span>
                <span className="font-bold">{selectedRecord.customer_phone || 'Walk-in Client'}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold">{selectedRecord.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(selectedRecord.total_amount || 0)}</span>
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
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
