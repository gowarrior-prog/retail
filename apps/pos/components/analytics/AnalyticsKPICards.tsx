'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface AnalyticsKPICardsProps {
  totalRevenue: number;
  invoiceCount: number;
  avgTicket: number;
  netProfit: number;
  grossProfit: number;
  fabricSuits: number;
  fabricMeters: number;
  khataBalance: number;
  khataActiveCount: number;
}

export default function AnalyticsKPICards({
  totalRevenue,
  invoiceCount,
  avgTicket,
  netProfit,
  grossProfit,
  fabricSuits,
  fabricMeters,
  khataBalance,
  khataActiveCount,
}: AnalyticsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
      {/* Card 1: Total Sales Volume */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between hover:shadow-xs transition">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Sales Volume</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {formatCurrency(totalRevenue)}
            </h3>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 font-mono">
            {invoiceCount > 0 ? 'Live' : '0 Sales'}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
          <span>{invoiceCount} Invoiced Slips</span>
          <span className="text-slate-400 font-mono">Avg. Ticket Rs. {Math.round(avgTicket).toLocaleString()}</span>
        </div>
        <div className="w-full h-7 mt-2">
          <svg className="w-full h-full text-emerald-500" fill="none" preserveAspectRatio="none" viewBox="0 0 120 28">
            {totalRevenue > 0 ? (
              <>
                <path d="M0 24 L15 19 L30 22 L45 14 L60 18 L75 8 L90 12 L105 4 L120 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 24 L15 19 L30 22 L45 14 L60 18 L75 8 L90 12 L105 4 L120 7 V28 H0 Z" fill="currentColor" fillOpacity="0.08" />
              </>
            ) : (
              <line stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="1.5" x1="0" x2="120" y1="14" y2="14" />
            )}
          </svg>
        </div>
      </div>

      {/* Card 2: Net Realized Profit */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between hover:shadow-xs transition">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Realized Profit</p>
            <h3 className="text-2xl font-black text-emerald-800 mt-1 font-mono tracking-tight">
              {formatCurrency(netProfit)}
            </h3>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800 font-mono">
            {totalRevenue > 0 ? '21.0% Margin' : '0% Margin'}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
          <span className="text-slate-600 font-semibold font-mono">Gross: {formatCurrency(grossProfit)}</span>
          <span className="text-emerald-700 font-medium">{totalRevenue > 0 ? 'Realized' : 'No Sales'}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
          <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: totalRevenue > 0 ? '78%' : '0%' }}></div>
        </div>
      </div>

      {/* Card 3: Fabric Volume Outflow */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between hover:shadow-xs transition">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fabric Volume Outflow</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {fabricSuits} <span className="text-sm font-semibold text-slate-500 font-sans">Suits</span>
            </h3>
          </div>
        
        </div>
        <div className="mt-4 text-xs text-slate-500 pt-3 border-t border-slate-100 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-600 font-medium">Total Suits Sold: {fabricSuits}</span>
            <span className="text-slate-400 font-mono">{fabricMeters} Meters</span>
          </div>
        </div>
      </div>

      {/* Card 4: Market Khata (Receivables) */}
      <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between hover:shadow-xs transition">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Market Dues</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1 font-mono tracking-tight">
              {formatCurrency(khataBalance)}
            </h3>
          </div>
         
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
          <span className="text-slate-600 font-semibold flex items-center gap-1 font-mono">
            Active Accounts: {khataActiveCount}
          </span>
          <span className="text-slate-400 font-mono">Outstanding: {formatCurrency(khataBalance)}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden flex">
          <div className="bg-emerald-500 h-1.5" style={{ width: khataBalance > 0 ? '100%' : '0%' }}></div>
        </div>
      </div>
    </div>
  );
}
