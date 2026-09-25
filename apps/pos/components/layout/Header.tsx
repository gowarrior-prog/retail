'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Lock, Maximize2, User } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useProductStore } from '@/stores/useProductStore';
import { discoverLocalServer } from '@/lib/api';
import CashierSelectModal from '@/components/checkout/CashierSelectModal';
import HoldOrdersModal from '@/components/checkout/HoldOrdersModal';

export default function Header() {
  const { loadProducts } = useProductStore();
  const { cashierName } = useCartStore();
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadProducts();
    discoverLocalServer().catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await discoverLocalServer();
      await loadProducts();
    } catch {
      // Ignore refresh error
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const currentCashier = cashierName || 'Zahid Khan';

  return (
    <>
      {/* Top Clean Application Header matching reference design */}
      <header className="bg-white border-b border-slate-200 px-6 pr-8 py-2.5 flex items-center justify-between shadow-2xs shrink-0 font-sans z-20">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center bg-slate-50 text-slate-700 font-bold shadow-2xs">
            <span className="text-[11px] font-black tracking-tighter">BC</span>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-800 uppercase font-sans">
            BILAL CLOTH & SILK CENTER
          </span>
        </div>

        {/* Header Actions & Cashier Profile */}
        <div className="flex items-center gap-3">
          {/* Cashier User Pill Button */}
          <button
            onClick={() => setShowCashierModal(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/90 transition-all rounded-lg px-3.5 py-1.5 cursor-pointer border border-slate-200/80 text-xs font-bold text-slate-700"
          >
            <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-[10px]">
              <User className="w-3 h-3 text-slate-600" />
            </div>
            <span>{currentCashier}</span>
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5 text-slate-600 text-sm">
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Refresh / Sync"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={() => setShowCashierModal(true)}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Lock Terminal"
            >
              <Lock className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showCashierModal && (
        <CashierSelectModal
          currentCashierId={null}
          onSelect={(c) => {
            useCartStore.setState({ cashierName: c.name });
            setShowCashierModal(false);
          }}
          onClose={() => setShowCashierModal(false)}
        />
      )}
      {showHoldModal && <HoldOrdersModal onClose={() => setShowHoldModal(false)} />}
    </>
  );
}
