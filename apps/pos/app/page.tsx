'use client';
import { useEffect } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import LeftRegisterPanel from '@/components/checkout/LeftRegisterPanel';
import CategoryNavSlider from '@/components/checkout/CategoryNavSlider';
import ProductCatalogGrid from '@/components/checkout/ProductCatalogGrid';

export default function CheckoutPOSPage() {
  const { loadProducts } = useProductStore();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden flex flex-col bg-slate-100 select-none">
      {/* Main Register Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left Cart & Touch Keypad Panel */}
        <LeftRegisterPanel />

        {/* Right Catalog & Filter Panel - hidden on mobile when cart is active, shown on lg+ */}
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
                DB Connected
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
