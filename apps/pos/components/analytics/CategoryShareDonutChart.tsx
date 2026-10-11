'use client';

import React from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';

export default function CategoryShareDonutChart() {
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
        </svg>
        <div className="absolute text-center">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight block">Total Vol</span>
          <span className="text-base font-black text-slate-900 font-mono">Rs. 0</span>
        </div>
      </div>

      {/* Legend Breakdown */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
            <span className="text-slate-700 font-medium">Unstitched Lawn</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">Rs. 0</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-700 font-medium">Wash & Wear Gents</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">Rs. 0</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            <span className="text-slate-700 font-medium">Silk & Pure Chiffon</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">Rs. 0</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-700 font-medium">Bridal & Formal Suits</span>
          </div>
          <span className="font-bold text-slate-900 font-mono">Rs. 0</span>
        </div>
      </div>
    </div>
  );
}
