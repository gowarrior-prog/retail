'use client';
import { useState, useEffect } from 'react';
import { Search, PauseCircle, Wifi, WifiOff, History, RefreshCw, X, Receipt } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useProductStore } from '@/stores/useProductStore';
import { fetchBillingHistory, syncOdoo } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function Header() {
  const { isOnline, heldOrdersCount, isSyncing, setSyncing } = useUIStore();
  const { setSearchQuery, searchQuery, loadProducts } = useProductStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const records = await fetchBillingHistory();
      setHistoryRecords(records || []);
    } catch (err) {
      console.error('Failed to fetch billing history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSyncOdoo = async () => {
    setSyncing(true);
    try {
      await syncOdoo();
      await loadProducts();
    } catch (err) {
      console.error('Failed to sync Odoo:', err);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm font-mono tracking-wider">
              BC
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base tracking-tight leading-tight">
                Bilal Cloth & Silk
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Main Bazar Railway Road, Narowal</span>
            </div>
          </div>
          <div className="h-5 w-px bg-slate-200 mx-1 hidden lg:block" />
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-mono text-slate-600">
            <span>REG-01</span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-lg mx-2 hidden md:block">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
              placeholder="Search fabric items, SKU, barcode..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <kbd className="absolute right-2.5 bg-white border border-slate-200 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded">
              F1
            </kbd>
          </div>
        </div>

        {/* Right: Actions, Order History & Status */}
        <div className="flex items-center gap-2">
          {/* Order History Button in Top Nav */}
          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            title="View Recent Invoices (DB3)"
          >
            <History className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">Order History</span>
          </button>

          {/* Odoo ERP Sync Button */}
          <button
            onClick={handleSyncOdoo}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Sync products from Odoo ERP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Odoo'}</span>
          </button>

          {/* Held Orders Badge */}
          {heldOrdersCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <PauseCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>{heldOrdersCount} Held</span>
            </div>
          )}

          {/* Online/Offline Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="hidden lg:inline text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Cashier Badge */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-none">Tariq (Cashier)</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">Shift Lead</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs font-mono">
              T
            </div>
          </div>
        </div>
      </header>

      {/* Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-base">Order History (DB3 Invoices)</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-sm">Loading billing records...</div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No billing history records found in DB3.</div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
                      <tr>
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Client / Phone</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                      {historyRecords.map((rec: any) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{rec.invoice_number}</td>
                          <td className="p-3">{rec.customer_phone || 'Walk-in Client'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {rec.payment_mode}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(rec.total_amount || 0)}
                          </td>
                          <td className="p-3 text-right text-slate-500 text-[11px]">
                            {rec.created_at ? new Date(rec.created_at).toLocaleTimeString() : 'Today'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
