'use client';

import React from 'react';
import { X, ShoppingBag, Tag, Box, CheckCircle2, DollarSign, Barcode, Layers } from 'lucide-react';
import { Product } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem(product);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Scanned Product Details</h3>
              <p className="text-[11px] text-emerald-400 font-medium">✓ Barcode Matched Successfully</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Main Title & Price Header */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Product Name</span>
              <h4 className="text-base font-extrabold text-slate-900 leading-tight">{product.name}</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Price</span>
              <div className="text-lg font-black text-slate-900">{formatCurrency(product.price)}</div>
            </div>
          </div>

          {/* Details Table Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <Barcode className="w-3.5 h-3.5 text-indigo-600" />
                <span>Barcode / SKU</span>
              </div>
              <span className="font-mono font-bold text-slate-900 text-sm">{product.barcode || product.sku || product.id.slice(0, 8)}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <Box className="w-3.5 h-3.5 text-emerald-600" />
                <span>Available Stock</span>
              </div>
              <span className="font-bold text-emerald-700 text-sm">{product.stock || 0} Units In Stock</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Category</span>
              </div>
              <span className="font-bold text-slate-800">{product.category || 'General'}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                <DollarSign className="w-3.5 h-3.5 text-slate-600" />
                <span>Cost Price</span>
              </div>
              <span className="font-bold text-slate-800">{product.cost_price ? formatCurrency(product.cost_price) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handleAddToCart}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Add to Checkout Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
