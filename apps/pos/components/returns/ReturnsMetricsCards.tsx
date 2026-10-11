'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface MetricsProps {
  totalCustomerVal: number;
  totalCustomerCount: number;
  totalSupplierVal: number;
  totalSupplierCount: number;
  pendingTotalVal: number;
  countPending: number;
  damagedCount: number;
}

export default function ReturnsMetricsCards({
  totalCustomerVal,
  totalCustomerCount,
  totalSupplierVal,
  totalSupplierCount,
  pendingTotalVal,
  countPending,
  damagedCount,
}: MetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
      {/* Card 1: Total Customer Returns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Total Customer Returns</span>
        </div>
        <div className="mt-2 text-2xl font-black font-mono text-slate-900 group-hover:scale-105 transition-transform origin-left">
          {formatCurrency(totalCustomerVal)}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{totalCustomerCount} Returns processed</span>
        </div>
      </div>

      {/* Card 2: Total Supplier Returns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Total Supplier Returns</span>
        </div>
        <div className="mt-2 text-2xl font-black font-mono text-slate-900 group-hover:scale-105 transition-transform origin-left">
          {formatCurrency(totalSupplierVal)}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{totalSupplierCount} Debit notes</span>
        </div>
      </div>

      {/* Card 3: Pending Settlements */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Pending Settlements</span>
        </div>
        <div className="mt-2 text-2xl font-black font-mono group-hover:scale-105 transition-transform origin-left text-amber-700">
          {formatCurrency(pendingTotalVal)}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>{countPending} Pending records</span>
        </div>
      </div>

      {/* Card 4: Damaged / Defect Stock */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Damaged Stock</span>
        </div>
        <div className="mt-2 text-2xl font-black font-mono group-hover:scale-105 transition-transform origin-left text-rose-700">
          {damagedCount} Items
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Defect warehouse bin #4</span>
        </div>
      </div>
    </div>
  );
}
