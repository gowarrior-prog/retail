'use client';

import { useEffect, useState, useRef } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { Product } from '@/lib/api';
import LeftRegisterPanel from '@/components/checkout/LeftRegisterPanel';
import CategoryNavSlider from '@/components/checkout/CategoryNavSlider';
import ProductCatalogGrid from '@/components/checkout/ProductCatalogGrid';

export default function CheckoutPOSPage() {
  const { loadProducts, products } = useProductStore();
  const { addItem } = useCartStore();

  const [scanToast, setScanToast] = useState<string | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Play subtle POS beep on successful scan
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Audio autoplay policy fallback
    }
  };

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
            playScanBeep();

            // Show brief non-intrusive notification banner (not a blocking popup modal)
            setScanToast(`✓ Added: ${match.name}`);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setScanToast(null);
            }, 2000);
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
    <div className="h-full w-full overflow-hidden flex flex-col bg-slate-100 select-none relative">
      {/* Non-intrusive Quick Scan Toast (auto disappears in 2s, does NOT block screen) */}
      {scanToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>{scanToast}</span>
        </div>
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
