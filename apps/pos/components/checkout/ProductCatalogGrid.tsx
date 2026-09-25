'use client';

import { useState, useEffect } from 'react';
import { Shirt } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';

export default function ProductCatalogGrid() {
  const { filteredProducts, selectedCategory, searchQuery } = useProductStore();
  const { addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const matchingItems = (mounted && filteredProducts) ? filteredProducts.filter((p: any) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === 'All' ||
      selectedCategory === 'ALL Items' ||
      p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) : [];

  const displayItems = matchingItems.slice(0, 24);

  return (
    <div className="flex-1 overflow-y-auto font-sans pr-1">
      {matchingItems.length === 0 ? (
        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
            <Shirt className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">No products found</p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Try searching with a different SKU, name, or barcode.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-4">
          {displayItems.map((prod: any, idx: number) => {
            const categoryName = (prod.category || 'General').toUpperCase();
            const skuVal = prod.sku || prod.barcode || (prod.id ? prod.id.slice(0, 8) : '');
            const fabricDetail = prod.description || '';
            const stockQty = prod.stock ?? prod.quantity ?? 0;
            const hasImage = Boolean(prod.image_url || prod.image);
            const imageUrl = prod.image_url || prod.image;

            return (
              <div
                key={prod.id || idx}
                onClick={() => addItem(prod)}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500 transition-all duration-200 cursor-pointer group flex flex-col active:scale-[0.98] relative"
              >
                {/* Render top image ONLY if product has image_url/image */}
                {hasImage ? (
                  <div className="h-32 bg-slate-100 relative overflow-hidden shrink-0">
                    <img
                      src={imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-[#1b3830]/90 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs border border-emerald-500/20">
                      STK: {stockQty}
                    </div>
                  </div>
                ) : (
                  /* Stock Badge floating top-right if no image */
                  <div className="flex justify-end p-2.5 pb-0">
                    <span className="bg-[#1b3830] text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs border border-emerald-500/20">
                      STK: {stockQty}
                    </span>
                  </div>
                )}

                {/* Card Details */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category & SKU row */}
                    <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-400 tracking-wider">
                      <span className="uppercase text-slate-500">{categoryName}</span>
                      {skuVal && <span className="font-mono text-slate-400">{skuVal}</span>}
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 transition-colors mt-1 line-clamp-1 leading-snug">
                      {prod.name}
                    </h4>

                    {/* Description Subtext */}
                    {fabricDetail && (
                      <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                        {fabricDetail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
