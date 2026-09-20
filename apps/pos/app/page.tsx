'use client';

import { useEffect, useState, useRef } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { Product } from '@/lib/api';
import LeftRegisterPanel from '@/components/checkout/LeftRegisterPanel';
import CategoryNavSlider from '@/components/checkout/CategoryNavSlider';
import ProductCatalogGrid from '@/components/checkout/ProductCatalogGrid';
import ProductDetailModal from '@/components/checkout/ProductDetailModal';

export default function CheckoutPOSPage() {
  const { loadProducts, products } = useProductStore();
  const { addItem } = useCartStore();

  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Global Hardware Barcode Scanner Listener
  // Hardware scanners type fast (< 50ms per key) followed by 'Enter' (key 13)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea element
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 150) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = barcodeBufferRef.current.trim();
        if (code) {
          const match = products.find(
            (p) =>
              (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
              (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
              p.id.toLowerCase() === code.toLowerCase()
          );

          if (match) {
            addItem(match);
            setScannedProduct(match);
          }
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, addItem]);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-slate-100 select-none">
      {/* Scanned Product Detail Modal */}
      {scannedProduct && (
        <ProductDetailModal
          product={scannedProduct}
          onClose={() => setScannedProduct(null)}
        />
      )}

      {/* Main Register Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Cart & Touch Keypad Panel */}
        <LeftRegisterPanel />

        {/* Right Catalog & Filter Panel */}
        <section
          className="hidden lg:flex flex-1 flex-col h-full overflow-hidden bg-slate-50 min-w-0"
          data-purpose="product-catalog-section"
        >
          {/* Category Filter Bar */}
          <CategoryNavSlider />

          {/* Product Catalog Grid */}
          <ProductCatalogGrid />

          {/* Bottom Status Bar */}
          <footer
            className="h-7 bg-white border-t border-slate-200 px-3 flex items-center justify-between text-[10px] text-slate-500 shrink-0"
            data-purpose="pos-status-bar"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                DB Connected • Barcode Scanner Ready
              </span>
              <span className="hidden md:inline font-mono">
                REG-04 • POS/2026/09/0014
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[9px]">
              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">[Enter] Pay</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">[Esc] Cancel</span>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
