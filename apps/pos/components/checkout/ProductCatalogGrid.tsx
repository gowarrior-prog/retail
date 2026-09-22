'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Layers, Feather, Tag, Scissors, Sun, BadgePercent, Palette, Gem, Box, Shirt, Plus } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';

export default function ProductCatalogGrid() {
  const { filteredProducts, selectedCategory, searchQuery } = useProductStore();
  const { addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter & Slice items to top 48 for 60fps ultra-fast performance on low-end hardware
  const matchingItems = (mounted && filteredProducts) ? filteredProducts.filter((p: any) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'All' ||
      selectedCategory === 'All Items' ||
      p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) : [];

  const displayItems = matchingItems.slice(0, 48);

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-slate-50 flex flex-col justify-between">
      {matchingItems.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-2">
            <Shirt className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-600">No products found</p>
          <p className="text-xs text-slate-400 mt-0.5">Try searching with a different SKU, name, or barcode.</p>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>Showing top {displayItems.length} of {matchingItems.length.toLocaleString()} products</span>
            {matchingItems.length > 48 && <span className="text-emerald-700 font-semibold">Type SKU/name to narrow down</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2.5">
            {displayItems.map((prod: any, idx: number) => {
              const IconComponent = prod.icon || Sparkles;
              return (
                <div
                  key={prod.id || idx}
                  onClick={() => addItem(prod)}
                  className="bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between overflow-hidden group transform active:scale-[0.98]"
                >
                  {/* Clean Top Box with Price */}
                  <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center relative min-h-[85px]">
                    <span className="absolute top-1.5 right-1.5 text-slate-900 font-extrabold text-[11px] bg-white/90 px-1.5 py-0.5 rounded border border-slate-200 font-mono shadow-2xs">
                      Rs. {prod.price.toLocaleString()}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all">
                      <IconComponent className="w-5 h-5 text-slate-600 group-hover:text-emerald-700 transition-colors" />
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                        SKU: {prod.sku || prod.barcode || String(prod.id).slice(0, 6)}
                      </p>
                      <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight group-hover:text-emerald-800 transition-colors mt-0.5">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="font-mono text-[9.5px]">Stock: {prod.stock ?? 20}</span>
                      <span className="text-slate-700 font-bold flex items-center gap-0.5 group-hover:text-emerald-600 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
