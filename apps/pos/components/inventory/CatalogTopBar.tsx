'use client';

import { Search, Plus } from 'lucide-react';

const CATEGORY_FILTERS = [
  'ALL Items',
  'Unstitched Suits',
  'Shawls & Wool',
  'Kurta & Shalwar',
  'Silk & Banarasi',
  'Cotton Latha',
];

interface CatalogTopBarProps {
  onOpenAddDrawer: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function CatalogTopBar({
  onOpenAddDrawer,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: CatalogTopBarProps) {
  return (
    <div className="flex flex-col gap-3 font-sans shrink-0">
      {/* Search Input & Add Cloth Button Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-slate-400" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Scan barcode or enter SKU / Item name..."
            className="w-full pl-10 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b3830] shadow-2xs"
          />
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-mono font-bold text-slate-400 uppercase">
            ALT + S
          </span>
        </div>

        <button
          onClick={onOpenAddDrawer}
          className="px-4 py-2.5 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Cloth</span>
        </button>
      </div>

      {/* Category Pills Row (Pure Clean Titles without Fake Numbers) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORY_FILTERS.map((name) => {
          const isSelected =
            selectedCategory === name ||
            (name === 'ALL Items' && (selectedCategory === 'All' || !selectedCategory));

          return (
            <button
              key={name}
              onClick={() => onSelectCategory(name === 'ALL Items' ? 'All' : name)}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                isSelected
                  ? 'bg-[#1b3830] text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
