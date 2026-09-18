import React, { useState, useEffect } from 'react';
import { Search, History, RefreshCw, X, Receipt, Layers, Lock, UserCircle2, Wifi, WifiOff } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { fetchBillingHistory, syncOdoo, discoverLocalServer, syncPendingOfflineData, getLocalOfflineBills } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import CashierSelectModal from '@/components/checkout/CashierSelectModal';

export default function Header() {
  const { heldOrdersCount, isSyncing, setSyncing } = useUIStore();
  const { setSearchQuery, searchQuery, loadProducts } = useProductStore();
  const { cashierName, setCashierName } = useCartStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline'>('connected');

  useEffect(() => {
    // Check pending offline bills count
    setPendingBillsCount(getLocalOfflineBills().length);

    // Auto-discover local shop server IP on local network
    discoverLocalServer().then((res) => {
      if (res.success) {
        setConnectionStatus('connected');
        loadProducts();
        syncPendingOfflineData().then(() => {
          setPendingBillsCount(getLocalOfflineBills().length);
        });
      } else {
        setConnectionStatus('offline');
      }
    });

    // Background offline bill auto-sync loop every 15 seconds
    const interval = setInterval(() => {
      syncPendingOfflineData().then(() => {
        setPendingBillsCount(getLocalOfflineBills().length);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

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
      await discoverLocalServer();
      await syncOdoo();
      await syncPendingOfflineData();
      await loadProducts();
      setPendingBillsCount(getLocalOfflineBills().length);
    } catch (err) {
      console.error('Failed to sync Odoo:', err);
    } finally {
      setSyncing(false);
    }
  };

  const currentCashierName = cashierName || 'Admin';

  const initials = currentCashierName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="h-14 bg-white text-slate-800 flex items-center justify-between px-3 sm:px-4 z-20 shrink-0 border-b border-slate-200 shadow-2xs">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {/* Circular Logo */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/logo.png"
                alt="Bilal Cloth House Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-slate-900 flex items-center gap-1.5 font-sans">
                <span className="truncate">BILAL CLOTH</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 sm:px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                  POS v17
                </span>
              </span>
              <span className="text-[8px] sm:text-[9.5px] text-slate-400 font-semibold tracking-wider uppercase truncate">
                HOUSE & SILK CENTER • NAROWAL
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-slate-200 pl-3 text-xs shrink-0">
            {connectionStatus === 'connected' ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-medium" title="Connected to Local Shop Server">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>LAN Server</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium" title="Running in 100% Offline IndexedDB Engine Mode">
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>Offline Engine</span>
              </span>
            )}

            {pendingBillsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold animate-bounce">
                <span>{pendingBillsCount} Pending Sync</span>
              </span>
            )}
            <button
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition text-[11px] font-semibold cursor-pointer active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-emerald-700">1</span> Active Order
            </button>
          </div>
        </div>

        {/* Central Search Bar */}
        <div className="flex-1 max-w-md mx-3 hidden sm:block">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="product-search-input"
              className="w-full pl-9 pr-14 py-1.5 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-inner font-medium"
              placeholder="Search items by barcode, SKU or title..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Cashier & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cashier Pill - Clickable to open modal */}
          <button
            onClick={() => setShowCashierModal(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer active:scale-95"
          >
            <div className="relative">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shadow-inner">
                {initials}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full"></span>
            </div>
            <div className="flex flex-col text-left hidden sm:block leading-none">
              <span className="text-xs font-bold text-slate-900">{currentCashierName}</span>
              <span className="text-[9.5px] text-emerald-600 font-semibold">Cashier</span>
            </div>
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleSyncOdoo}
              disabled={isSyncing}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
              title="Sync Online"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenHistory}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Order History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer hidden sm:flex"
              title="Lock Terminal"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Cashier Select Modal */}
      {showCashierModal && (
        <CashierSelectModal
          currentCashierId={null}
          onSelect={(cashier) => {
            setCashierName(cashier.name);
            setShowCashierModal(false);
          }}
          onClose={() => setShowCashierModal(false)}
        />
      )}

      {/* Order History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Recent Invoices & Order History</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Completed billing transactions from DB3</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500 text-sm font-medium">Loading sales history...</div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">No sales transactions recorded yet.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
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
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{rec.invoice_number}</td>
                          <td className="p-3 font-sans font-medium">{rec.customer_phone || 'Walk-in Client'}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              {rec.payment_mode}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(rec.total_amount || 0)}
                          </td>
                          <td className="p-3 text-right text-slate-500 text-[11px]">
                            {rec.created_at ? new Date(rec.created_at).toLocaleString() : 'Recent'}
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
