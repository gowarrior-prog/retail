'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Search, Plus, RefreshCw, X, Truck } from 'lucide-react';
import { fetchPurchases, syncOdooPurchases } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPurchases();
      setPurchases(data || []);
    } catch (err) {
      console.error('Failed to load DB3 Shop Purchases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPurchases = async () => {
    setIsSyncing(true);
    try {
      await syncOdooPurchases();
      await loadPurchases();
    } catch (err) {
      console.error('Failed to sync Odoo Purchases:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.supplier_name?.toLowerCase().includes(q) ||
        p.item_name?.toLowerCase().includes(q)
      );
    });
  }, [purchases, searchQuery]);

  const totalCost = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
  const totalRemaining = purchases.reduce((sum, p) => sum + (p.remaining || 0), 0);

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <ShoppingBag className="w-5.5 h-5.5 text-indigo-600" />
            Shop Stock Purchases & Vendor Supplies
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Track fabric buys from suppliers and vendor payment status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncPurchases}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-indigo-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing Purchases...' : 'Sync Odoo Purchases'}</span>
          </button>

          <button
            onClick={loadPurchases}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Total Inventory Purchases</span>
          <span className="text-2xl font-black font-mono text-slate-900">{formatCurrency(totalCost)}</span>
          <span className="text-[11px] text-slate-500">Gross Purchased Cost</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Total Paid to Vendors</span>
          <span className="text-2xl font-black font-mono text-emerald-600">{formatCurrency(totalPaid)}</span>
          <span className="text-[11px] text-slate-500">Settled Payments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500 uppercase font-mono">Remaining Vendor Dues</span>
          <span className="text-2xl font-black font-mono text-red-600">{formatCurrency(totalRemaining)}</span>
          <span className="text-[11px] text-slate-500">Outstanding Payables</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
            placeholder="Search by supplier name or item..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">Supplier Purchase Records ({filteredPurchases.length})</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-mono">Loading purchase records from DB3...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No vendor purchases recorded yet in DB3.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
                <tr>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Item Purchased</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total Cost</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Remaining</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {filteredPurchases.map((p, idx) => (
                  <tr key={p.id || `pur-${idx}`} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{p.supplier_name}</td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{p.item_name}</td>
                    <td className="p-3 text-center">{p.quantity}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(p.total_cost)}</td>
                    <td className="p-3 text-right text-emerald-600">{formatCurrency(p.paid_amount)}</td>
                    <td className="p-3 text-right font-bold text-red-600">{formatCurrency(p.remaining)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(p)}
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

      {/* Inspect Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 shadow-xl border border-slate-200 max-w-md w-full flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm font-mono">
                Purchase Detail: {selectedRecord.supplier_name}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono flex flex-col gap-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Item Name:</span>
                <span className="font-bold">{selectedRecord.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Quantity Purchased:</span>
                <span className="font-bold">{selectedRecord.quantity} units</span>
              </div>
              <div className="flex justify-between">
                <span>Total Purchase Cost:</span>
                <span className="font-bold text-slate-900">{formatCurrency(selectedRecord.total_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <span className="text-emerald-600">{formatCurrency(selectedRecord.paid_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Payable:</span>
                <span className="text-red-600 font-bold">{formatCurrency(selectedRecord.remaining)}</span>
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
