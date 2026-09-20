import React, { useState, useEffect } from 'react';
import { History, RefreshCw, X, Receipt, Layers, Lock, UserCircle2, Wifi, WifiOff } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { fetchBillingHistory, discoverLocalServer, syncPendingOfflineData, fetchOfflineSummary, fetchSystemStatus } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import CashierSelectModal from '@/components/checkout/CashierSelectModal';

export default function Header() {
  const { heldOrdersCount, isSyncing, setSyncing } = useUIStore();
  const { loadProducts } = useProductStore();
  const { cashierName, setCashierName } = useCartStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'offline'>('connected');
  const [cloudDbStatus, setCloudDbStatus] = useState<boolean>(true);

  const updatePendingCount = () => {
    fetchSystemStatus().then(res => {
      if (res) {
        if (typeof res.pending_bills_count === 'number') {
          setPendingBillsCount(res.pending_bills_count);
        }
        setCloudDbStatus(!!res.cloud_db_connected);
      }
    }).catch(() => null);
  };

  const checkConnectionAndSync = () => {
    discoverLocalServer().then((res) => {
      if (res.success) {
        setConnectionStatus('connected');
        syncPendingOfflineData().then(() => {
          updatePendingCount();
        });
      } else {
        setConnectionStatus('offline');
        updatePendingCount();
      }
    }).catch(() => {
      setConnectionStatus('offline');
    });
  };

  useEffect(() => {
    updatePendingCount();
    loadProducts();
    checkConnectionAndSync();

    // Background connection health check & auto-sync loop every 10 seconds
    const interval = setInterval(() => {
      checkConnectionAndSync();
    }, 10000);

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

  const handleSyncCloudDB = async () => {
    setSyncing(true);
    try {
      await discoverLocalServer();
      const res = await syncPendingOfflineData();
      await loadProducts(true);
      updatePendingCount();
      alert(`Cloud DB Sync Result: Synced ${res?.synced_count || 0} offline records to Cloud Database!`);
    } catch (err) {
      console.error('Failed to sync Cloud DB:', err);
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

          {/* Active Order Badge */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2 sm:pl-3 text-xs shrink-0">
            <button
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition text-[11px] font-semibold cursor-pointer active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-emerald-700">1</span> Active Order
            </button>
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
              onClick={handleSyncCloudDB}
              disabled={isSyncing}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
              title="Sync SQLite Data to Cloud Database"
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
