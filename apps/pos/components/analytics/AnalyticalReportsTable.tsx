'use client';

import React, { useState } from 'react';
import { BarChart3, Users, RotateCcw } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';

interface AnalyticalReportsTableProps {
  activeTab?: 'inventory' | 'salesmen' | 'customers' | 'returns';
  onTabChange?: (tab: 'inventory' | 'salesmen' | 'customers' | 'returns') => void;
}

export default function AnalyticalReportsTable({
  activeTab: externalActiveTab,
  onTabChange,
}: AnalyticalReportsTableProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'inventory' | 'salesmen' | 'customers' | 'returns'>('inventory');

  const activeTab = externalActiveTab || internalActiveTab;

  const handleTabClick = (tab: 'inventory' | 'salesmen' | 'customers' | 'returns') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden font-sans">
      {/* Tab Controls Bar */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-5 pt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex space-x-2 -mb-px overflow-x-auto text-xs font-bold font-sans">
          <button
            type="button"
            onClick={() => handleTabClick('inventory')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Fast-Moving vs Dead Stock</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">0 items</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('salesmen')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'salesmen'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Salesman Performance</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">0 Rank</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('customers')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'customers'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>Client Retention & Repeat</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">0% Loyals</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('returns')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'returns'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Returns & Claims</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">0% Rate</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Fast-Moving vs Dead Stock Table */}
      {activeTab === 'inventory' && (
        <div className="p-8 text-center text-slate-400 text-xs font-mono">
          No inventory stock velocity recorded yet.
        </div>
      )}

      {/* TAB 2: Salesman Leaderboard */}
      {activeTab === 'salesmen' && (
        <div className="p-8 text-center text-slate-400 text-xs font-mono">
          No salesman counter transactions recorded yet.
        </div>
      )}

      {/* TAB 3: Client Retention */}
      {activeTab === 'customers' && (
        <div className="p-8 text-center text-slate-400 text-xs font-mono">
          No client repeat purchase data recorded yet.
        </div>
      )}

      {/* TAB 4: Returns & Claims */}
      {activeTab === 'returns' && (
        <div className="p-8 text-center text-slate-400 text-xs font-mono">
          No return slips or claims recorded yet.
        </div>
      )}
    </div>
  );
}
