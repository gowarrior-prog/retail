'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface FiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'all' | 'completed' | 'pending' | 'restocked' | 'damaged';
  onFilterChange: (filter: 'all' | 'completed' | 'pending' | 'restocked' | 'damaged') => void;
  countAll: number;
  countCompleted: number;
  countPending: number;
  countRestocked: number;
  countDamaged: number;
}

export default function ReturnsTableFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onFilterChange,
  countAll,
  countCompleted,
  countPending,
  countRestocked,
  countDamaged,
}: FiltersProps) {
  return (
    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300 font-sans">
      {/* Search Bar */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#1b3830]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search return code, client, or invoice..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1b3830] transition-all duration-200"
        />
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">STATUS:</span>

        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({countAll})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('completed')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            statusFilter === 'completed'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Completed ({countCompleted})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('pending')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            statusFilter === 'pending'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Pending Settlement ({countPending})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('restocked')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            statusFilter === 'restocked'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Restocked ({countRestocked})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('damaged')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${
            statusFilter === 'damaged'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Damaged Claim ({countDamaged})
        </button>
      </div>
    </div>
  );
}
