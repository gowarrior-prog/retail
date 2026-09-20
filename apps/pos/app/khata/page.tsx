'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, UserCheck, ArrowUpRight, ArrowDownLeft, RefreshCw, X, CreditCard } from 'lucide-react';
import { fetchKhata, syncOdooKhata, getLocalKhataCache } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function KhataPage() {
  const [khataRecords, setKhataRecords] = useState<any[]>(() => getLocalKhataCache());
  const [isLoading, setIsLoading] = useState<boolean>(() => getLocalKhataCache().length === 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const loadKhata = async () => {
    try {
      const data = await fetchKhata();
      setKhataRecords(data || []);
    } catch (err) {
      console.error('Failed to load DB3 Customer Khata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncKhata = async () => {
    setIsSyncing(true);
    try {
      await syncOdooKhata();
      await loadKhata();
    } catch (err) {
      console.error('Failed to sync Odoo Khata:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadKhata();
  }, []);

  const filteredKhata = useMemo(() => {
    return khataRecords.filter((k) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        k.customer_name?.toLowerCase().includes(q) ||
        k.phone?.toLowerCase().includes(q)
      );
    });
  }, [khataRecords, searchQuery]);

  const totalOutstandingBalance = khataRecords.reduce(
    (sum, k) => sum + (k.total_balance > 0 ? k.total_balance : 0),
    0
  );

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <BookOpen className="w-5.5 h-5.5 text-indigo-600" />
            Customer Khata & Credit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Track customer credit balances, Udhari, and Vasooli history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncKhata}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-indigo-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing Khata...' : 'Sync Odoo Khata'}</span>
          </button>

          <button
            onClick={loadKhata}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Outstanding Udhari</span>
            <span className="text-2xl font-bold font-mono text-red-600 tracking-tight">{formatCurrency(totalOutstandingBalance)}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Khata Accounts</span>
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{khataRecords.length}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ledger Status</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 tracking-tight">Active</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
            placeholder="Search customer by name or phone number..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Khata Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">Customer Ledger Accounts ({filteredKhata.length})</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-mono">Loading customer khata records from DB3...</div>
        ) : filteredKhata.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No customer khata records found. When customers make purchases with Credit Khata mode, accounts are created automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
                <tr>
                  <th className="p-3">Customer Name</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3 text-right">Current Balance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {filteredKhata.map((k, idx) => {
                  const isUdhari = k.total_balance > 0;
                  return (
                    <tr key={k.id || `khata-${idx}`} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{k.customer_name || 'Khata Customer'}</td>
                      <td className="p-3">{k.phone}</td>
                      <td className="p-3 text-right font-bold text-sm">
                        <span className={isUdhari ? 'text-red-600' : 'text-emerald-600'}>
                          {formatCurrency(Math.abs(k.total_balance || 0))}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded font-bold text-[10px]',
                            isUdhari ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          )}
                        >
                          {isUdhari ? 'Udhari (Customer Owes)' : 'Paid / Settled'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedRecord(k)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 shadow-xl border border-slate-200 max-w-md w-full flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm font-mono">
                Khata Account: {selectedRecord.customer_name}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono flex flex-col gap-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Customer Phone:</span>
                <span className="font-bold">{selectedRecord.phone}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className={selectedRecord.total_balance > 0 ? 'font-bold text-red-600' : 'font-bold text-emerald-600'}>
                  {formatCurrency(selectedRecord.total_balance || 0)}
                </span>
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
