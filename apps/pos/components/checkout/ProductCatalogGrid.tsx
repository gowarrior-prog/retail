'use client';

import { useState, useEffect } from 'react';
import { Shirt, ShoppingBag, AlertTriangle, X } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';

export default function ProductCatalogGrid() {
  const { filteredProducts, selectedCategory, searchQuery, isLoading } = useProductStore();
  const { addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || (isLoading && (!filteredProducts || filteredProducts.length === 0))) {
    return (
      <div className="flex-1 overflow-y-auto font-sans pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/90 p-3 h-[180px] animate-pulse flex flex-col justify-between">
              <div className="flex gap-2.5">
                <div className="w-16 h-16 rounded-lg bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const matchingItems = filteredProducts ? filteredProducts.filter((p: any) => {
    const stockQty = p.stock ?? p.quantity ?? 0;
    if (stockQty <= 0) return false;

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
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-700">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-4">
          {displayItems.map((prod: any, idx: number) => {
            const categoryName = (prod.category || 'General').toUpperCase();
            const skuVal = prod.sku || prod.barcode || (prod.id ? prod.id.slice(0, 8) : '');
            const fabricDetail = prod.description || '';
            const stockQty = prod.stock ?? prod.quantity ?? 0;
            const isOutOfStock = stockQty <= 0;
            const hasImage = Boolean(prod.image_url || prod.image);
            const imageUrl = prod.image_url || prod.image;

            return (
              <div
                key={prod.id || idx}
                onClick={() => {
                  if (isOutOfStock) {
                    setOutOfStockProduct(prod);
                    return;
                  }
                  addItem(prod);
                }}
                className={`rounded-2xl border overflow-hidden shadow-2xs transition-all duration-200 group flex flex-col relative select-none ${
                  isOutOfStock
                    ? 'bg-slate-100/90 border-red-200/80 opacity-60 grayscale cursor-not-allowed hover:border-red-300'
                    : 'bg-white border-slate-200/90 hover:shadow-md hover:border-emerald-500 cursor-pointer active:scale-[0.98]'
                }`}
              >
                {/* Out of Stock Overlay Banner */}
                {isOutOfStock && (
                  <div className="absolute top-0 left-0 right-0 bg-red-600/90 text-white text-[9px] font-black uppercase tracking-widest text-center py-0.5 z-10 shadow-xs">
                    OUT OF STOCK
                  </div>
                )}

                {/* Render top image ONLY if product has image_url/image */}
                {hasImage ? (
                  <div className="h-32 bg-slate-100 relative overflow-hidden shrink-0">
                    <img
                      src={imageUrl}
                      alt={prod.name}
                      className={`w-full h-full object-cover transition-transform duration-300 ${
                        isOutOfStock ? 'filter grayscale brightness-90' : 'group-hover:scale-105'
                      }`}
                      loading="lazy"
                    />
                    <div
                      className={`absolute top-2 right-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs border ${
                        isOutOfStock
                          ? 'bg-red-900/90 text-red-200 border-red-500/40'
                          : 'bg-[#1b3830]/90 text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {isOutOfStock ? `STK: ${stockQty}` : `STK: ${stockQty}`}
                    </div>
                  </div>
                ) : (
                  /* Stock Badge floating top-right if no image */
                  <div className="flex justify-end p-2.5 pb-0 pt-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-xs border ${
                        isOutOfStock
                          ? 'bg-red-900/90 text-red-200 border-red-500/40'
                          : 'bg-[#1b3830] text-emerald-300 border-emerald-500/20'
                      }`}
                    >
                      {isOutOfStock ? `STK: ${stockQty}` : `STK: ${stockQty}`}
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
                    <h4
                      className={`text-xs font-extrabold transition-colors mt-1 line-clamp-1 leading-snug ${
                        isOutOfStock ? 'text-slate-500 line-through' : 'text-slate-800 group-hover:text-emerald-800'
                      }`}
                    >
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

      {/* Out of Stock Alert Modal */}
      {outOfStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 font-sans">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 text-red-600">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Product Out of Stock!</h3>
                </div>
              </div>
              <button
                onClick={() => setOutOfStockProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/60 text-xs text-slate-700 space-y-1.5">
              <p className="font-bold text-slate-900 text-sm">
                {outOfStockProduct.name}
              </p>
              <p className="text-slate-600">
                Sorry! This product is out of stock. (<span className="font-mono font-bold text-red-600">STK: {outOfStockProduct.stock ?? outOfStockProduct.quantity ?? 0}</span>).
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setOutOfStockProduct(null)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
