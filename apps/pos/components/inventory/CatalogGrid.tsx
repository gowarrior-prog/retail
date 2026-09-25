'use client';

import { useProductStore } from '@/stores/useProductStore';
import { Shirt, Trash2 } from 'lucide-react';

interface CatalogGridProps {
  searchQuery: string;
  selectedCategory: string;
  onSelectProduct: (p: any) => void;
  onDeleteProduct: (id: string) => void;
}

export default function CatalogGrid({
  searchQuery,
  selectedCategory,
  onSelectProduct,
  onDeleteProduct,
}: CatalogGridProps) {
  const { products } = useProductStore();

  const filtered = products.filter((item: any) => {
    const itemCat = (item.category || '').toLowerCase();
    const matchesCat =
      !selectedCategory ||
      selectedCategory === 'All' ||
      selectedCategory === 'ALL Items' ||
      itemCat.includes(selectedCategory.toLowerCase());

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      itemCat.includes(q);

    return matchesCat && matchesSearch;
  });

  return (
    <div className="font-sans">
      {filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-2.5">
            <Shirt className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">No cloth items found in catalog</p>
          <p className="text-xs text-slate-400 max-w-xs mt-0.5">
            Click "+ Add Cloth" above or sync Odoo to add products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item: any, idx: number) => {
            const categoryName = (item.category || 'General').toUpperCase();
            const skuVal = item.sku || item.barcode || '';
            const stockQty = item.stock ?? item.quantity ?? 0;
            const hasRealImage = Boolean(item.image_url);

            return (
              <div
                key={item.id || idx}
                onClick={() => onSelectProduct(item)}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-500 transition-all duration-200 cursor-pointer group flex flex-col justify-between relative active:scale-[0.99]"
              >
                {/* Top-Left Single-Click Instant Delete Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteProduct(item.id);
                  }}
                  className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-white/95 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 shadow-2xs flex items-center justify-center transition-all cursor-pointer opacity-90 group-hover:opacity-100"
                  title="Delete Product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Render top real image ONLY if product image_url exists */}
                {hasRealImage ? (
                  <div className="h-36 bg-slate-100 relative overflow-hidden shrink-0">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-[#1b3830]/90 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs border border-emerald-500/20">
                      STK: {stockQty}
                    </div>
                  </div>
                ) : (
                  /* Stock Badge floating top-right if no image */
                  <div className="flex justify-end p-3 pb-0">
                    <span className="bg-[#1b3830] text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs border border-emerald-500/20">
                      STK: {stockQty}
                    </span>
                  </div>
                )}

                {/* Card Body Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    {/* Category & SKU row */}
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 tracking-wider">
                      <span className="uppercase text-slate-500">{categoryName}</span>
                      {skuVal && <span className="font-mono text-slate-400">{skuVal}</span>}
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-emerald-800 transition-colors mt-1 line-clamp-1">
                      {item.name}
                    </h4>
                  </div>

                  {/* Price & Unit Row */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col">
                    <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                      SUIT PACK
                    </span>
                    <span className="text-sm font-black text-[#1b3830] font-mono mt-0.5">
                      PKR {Number(item.price || 0).toLocaleString()}
                    </span>
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
