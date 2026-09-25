'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';

const CATEGORY_NAMES = [
  'ALL Items',
  'Unstitched Suits',
  'Shawls & Wool',
  'Kurta & Shalwar',
  'Silk & Fabrics',
  'Embroidery',
  'Gents Collection',
  'Fancy & Bridal',
];

interface CategoryNavSliderProps {
  onOpenHoldModal: () => void;
}

export default function CategoryNavSlider({ onOpenHoldModal }: CategoryNavSliderProps) {
  const { selectedCategory, setCategory, searchQuery, setSearchQuery } = useProductStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  return (
    <div className="flex flex-col gap-3 font-sans shrink-0">
      {/* Top Search Input & Action Buttons Bar */}
      <div className="flex items-center gap-3">
        {/* Search Bar Input */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan barcode or enter SKU / Item name..."
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1b3830] focus:border-[#1b3830] transition-all font-medium shadow-2xs"
          />
        </div>

        {/* Filters Button */}
        <button className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 flex items-center cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0">
          Filters
        </button>

        {/* Pure Text Light Mint BILL HISTORY Button (No Numbers/Icons) */}
        <button
          onClick={onOpenHoldModal}
          className="px-4 py-2.5 bg-[#ebf2ee] hover:bg-[#e0eae4] active:scale-95 text-[#1b3830] border border-[#d2dfd8] rounded-xl text-xs font-extrabold tracking-wide uppercase flex items-center justify-center cursor-pointer shadow-2xs transition-all duration-200 shrink-0"
        >
          BILL HISTORY
        </button>
      </div>

      {/* Category Filter Pills Row (Pure Clean Titles without Fake Numbers) */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={scrollLeft}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full shrink-0 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
        >
          {CATEGORY_NAMES.map((name) => {
            const isSelected =
              selectedCategory === name ||
              (name === 'ALL Items' && (!selectedCategory || selectedCategory === 'All'));
            return (
              <button
                key={name}
                onClick={() => setCategory(name === 'ALL Items' ? 'All' : name)}
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

        <button
          onClick={scrollRight}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full shrink-0 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
