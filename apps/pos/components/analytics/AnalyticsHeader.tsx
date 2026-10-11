'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Download, FileText, Table, Printer, Check } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { exportToCSV } from '@/lib/utils';

interface AnalyticsHeaderProps {
  selectedPreset: string;
  onSelectPreset: (preset: string) => void;
  compareEnabled: boolean;
  onToggleCompare: (enabled: boolean) => void;
}

export default function AnalyticsHeader({
  selectedPreset,
  onSelectPreset,
  compareEnabled,
  onToggleCompare,
}: AnalyticsHeaderProps) {
  const [presetOpen, setPresetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 font-sans">
            Business Analytics & Insights
          </h1>
        </div>
      </div>

      {/* Date Controls & Export Action Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Preset Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPresetOpen(!presetOpen)}
            className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>
              Preset: <strong className="text-emerald-800 font-bold">{selectedPreset}</strong>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {presetOpen && (
            <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-1 font-sans text-xs">
              {['Today', 'Yesterday', 'This Week', 'This Month', 'Last 30 Days'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    onSelectPreset(p);
                    setPresetOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-left transition ${
                    selectedPreset === p ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{p}</span>
                  {selectedPreset === p && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comparison Toggle */}
        <label className="flex items-center space-x-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <input
            type="checkbox"
            checked={compareEnabled}
            onChange={(e) => onToggleCompare(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700">
            vs Aug 2026 (<span className="text-emerald-600 font-semibold">+14.2%</span>)
          </span>
        </label>

        {/* Date Display */}
        <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Sep 01 - Sep 30, 2026</span>
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportOpen(!exportOpen)}
            className="flex items-center space-x-1.5 bg-[#007A55] hover:bg-[#006345] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Report</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {exportOpen && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 z-50 py-1 font-sans text-xs">
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  exportToCSV('business_analytics_report.csv', ['Metric', 'Value'], [
                    ['Report Date', new Date().toLocaleDateString()],
                    ['Preset Period', selectedPreset],
                    ['Total Sales Volume', 'Rs. 0'],
                    ['Net Realized Profit', 'Rs. 0'],
                    ['Fabric Volume Outflow', '0 Suits'],
                    ['Market Khata Receivables', 'Rs. 0'],
                  ]);
                  showCatalogToast('Analytics report downloaded successfully', 'add');
                }}
                className="flex items-center w-full px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition gap-2"
              >
                <FileText className="w-4 h-4 text-rose-500" />
                Download Report (.csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  exportToCSV('sales_analytics_workbook.csv', ['Category', 'Sales', 'Profit Margin'], [
                    ['Unstitched Lawn', 'Rs. 0', '0%'],
                    ['Wash & Wear Gents', 'Rs. 0', '0%'],
                    ['Silk & Pure Chiffon', 'Rs. 0', '0%'],
                    ['Bridal & Formal Suits', 'Rs. 0', '0%'],
                  ]);
                  showCatalogToast('Workbook downloaded to your computer', 'add');
                }}
                className="flex items-center w-full px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition gap-2"
              >
                <Table className="w-4 h-4 text-emerald-600" />
                Excel Workbook (.csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportOpen(false);
                  window.print();
                }}
                className="flex items-center w-full px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition gap-2"
              >
                <Printer className="w-4 h-4 text-blue-500" />
                Print Wholesale Audit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
