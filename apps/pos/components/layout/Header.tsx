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

  const [isOdooSyncing, setIsOdooSyncing] = useState(false);

  const handleOdooSync = async () => {
    if (isOdooSyncing) return;
    const confirmed = window.confirm("Kia aap Odoo ERP se saara fresh data import karna chahte hain? Pehla local data wipe ho kar Odoo ka live data POS mein load ho jayega.");
    if (!confirmed) return;

    setIsOdooSyncing(true);
    try {
      const { wipeAndSyncOdoo } = await import('@/lib/api');
      const res = await wipeAndSyncOdoo(true);
      await loadProducts();
      window.dispatchEvent(new Event('pos-data-updated'));
      alert(res.message || "✓ Odoo ERP se saara data successfully import ho gaya!");
    } catch (err: any) {
      alert(`Odoo Sync Notice: ${err.message || 'Odoo server se connect nahi ho saka. Make sure Odoo is running at 192.168.100.2:8069'}`);
    } finally {
      setIsOdooSyncing(false);
    }
  };

  const currentCashier = cashierName || 'Zahid Khan';

  return (
    <>
      {/* Top Clean Application Header matching reference design */}
      <header className="bg-white border-b border-slate-200 px-6 pr-8 py-2.5 flex items-center justify-between shadow-2xs shrink-0 font-sans z-20">
        
       {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          {/* Clean High-DPI Emblem Icon Container */}
          <div className="h-12 w-12 flex items-center justify-center shrink-0">
            <img 
              src="/Screenshot 2026-09-26 210204.svg" 
              alt="Bilal Cloth Emblem" 
              className="w-full h-full object-contain drop-shadow-2xs select-none"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
              }}
            />
          </div>
          
          {/* Next.js Clean Typography - 100% Crisp & Sharp on All Screens */}
          <div className="flex flex-col justify-center">
            <h1 className="font-black tracking-tight text-[#1b3830] font-bold leading-none antialiased">
              BILAL CLOTH & SILK CENTER
            </h1>
            <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase font-mono mt-1">
              CLOTH HOUSE • NAROWAL
            </span>
          </div>
        </div>
        {/* Header Actions & Cashier Profile */}
        <div className="flex items-center gap-3">
          {/* 1-Click Odoo All-in-One Live Sync Button */}
          <button
            onClick={handleOdooSync}
            disabled={isOdooSyncing}
            className="flex items-center gap-1.5 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.98] text-white transition-all rounded-lg px-3 py-1.5 cursor-pointer text-xs font-bold shadow-xs disabled:opacity-50"
            title="Odoo ERP ka saara data POS mein layein"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isOdooSyncing ? 'animate-spin' : ''}`} />
            <span>{isOdooSyncing ? 'Odoo Syncing...' : 'Sync Odoo Data'}</span>
          </button>

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