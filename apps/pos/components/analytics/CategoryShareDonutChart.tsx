'use client';

import React, { useMemo } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryShareDonutChartProps {
  products?: any[];
  billingRecords?: any[];
}

const CATEGORY_COLORS = [
  { stroke: '#047857', bg: 'bg-emerald-700' }, // emerald-700
  { stroke: '#10b981', bg: 'bg-emerald-500' }, // emerald-500
  { stroke: '#0284c7', bg: 'bg-sky-600' },     // sky-600
  { stroke: '#f59e0b', bg: 'bg-amber-500' },   // amber-500
  { stroke: '#8b5cf6', bg: 'bg-violet-500' },  // violet-500
  { stroke: '#ec4899', bg: 'bg-pink-500' },    // pink-500
];

export default function CategoryShareDonutChart({
  products = [],
  billingRecords = [],
}: CategoryShareDonutChartProps) {
  const { categories, totalValue } = useMemo(() => {
    const catMap = new Map<string, number>();

    // 1. Try to accumulate revenue from billing records
    let totalSalesRev = 0;
    billingRecords.forEach((bill) => {
      try {
        const items = typeof bill.item_details_json === 'string'
          ? JSON.parse(bill.item_details_json)
          : (bill.items || []);
        items.forEach((item: any) => {
          const cat = item.category || 'General';
          const val = (Number(item.price) || 0) * (Number(item.quantity) || 1);
          catMap.set(cat, (catMap.get(cat) || 0) + val);
          totalSalesRev += val;
        });
      } catch {}
    });

    // 2. If no sales items yet, break down inventory valuation by category
    if (totalSalesRev <= 0 && products.length > 0) {
      products.forEach((p) => {
        const cat = p.category || 'General Fabrics';
        const val = (Number(p.price) || 0) * (Number(p.stock ?? p.quantity ?? 1));
        catMap.set(cat, (catMap.get(cat) || 0) + val);
        totalSalesRev += val;
      });
    }

    const sorted = Array.from(catMap.entries())
      .map(([name, val]) => ({ name, value: val }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { categories: sorted, totalValue: totalSalesRev };
  }, [products, billingRecords]);

  // Compute SVG Donut strokeDasharray segments (circumference = 2 * PI * 38 = 238.76)
  const circumference = 238.76;
  let accumulatedPercent = 0;

  const slices = categories.map((cat, idx) => {
    const percent = totalValue > 0 ? cat.value / totalValue : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length] || { stroke: '#047857', bg: 'bg-emerald-700' };
    return { ...cat, percent, strokeDasharray, strokeDashoffset, color };
  });

  return (
    <div className="bg-white p-5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col justify-between font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">
            Category Share
          </h4>
          <p className="text-xs text-slate-400 font-medium">Revenue split by fabric classification</p>
        </div>
        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
          <PieChartIcon className="w-4 h-4" />
        </span>
      </div>

      {/* Donut SVG */}
      <div className="relative flex items-center justify-center my-3">
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r="38"
              fill="none"
              stroke={slice.color.stroke}
              strokeWidth="12"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight block">
            {billingRecords.length > 0 ? 'Total Sales' : 'Inventory Vol'}
          </span>
          <span className="text-sm font-black text-slate-900 font-mono">
            Rs. {totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Legend Breakdown */}
      <div className="space-y-2 text-xs">
        {slices.length > 0 ? (
          slices.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${s.color.bg}`}></span>
                <span className="text-slate-700 font-medium truncate max-w-[140px]">{s.name}</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">
                Rs. {s.value.toLocaleString()} <span className="text-[10px] text-slate-400">({Math.round(s.percent * 100)}%)</span>
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-2 text-slate-400 text-xs font-mono">
            No category items recorded yet
          </div>
        )}
      </div>
    </div>
  );
}
