'use client';

import React, { useState, useEffect, useRef } from 'react';
import LeftRegisterPanel from '@/components/checkout/LeftRegisterPanel';
import CategoryNavSlider from '@/components/checkout/CategoryNavSlider';
import ProductCatalogGrid from '@/components/checkout/ProductCatalogGrid';
import HoldOrdersModal from '@/components/checkout/HoldOrdersModal';
import { useProductStore } from '@/stores/useProductStore';
import { useCartStore } from '@/stores/useCartStore';
import { showCatalogToast } from '@/lib/toast';

export default function CheckoutPOSPage() {
  const { products, loadProducts } = useProductStore();
  const { addItem } = useCartStore();
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
            showCatalogToast(`✓ Scanned: ${match.name}`, 'scan');
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
    <div className="flex-1 flex overflow-hidden w-full h-full relative font-sans">
      {/* Left 380px Cart & Register Panel */}
      <LeftRegisterPanel />

      {/* Right Main Counter Workspace */}
      <main className="flex-1 bg-[#f4f7f5] flex flex-col p-4 overflow-hidden relative min-w-0">
        {/* Top Search & Category Pills Navigation Bar */}
        <div className="mb-3.5 shrink-0">
          <CategoryNavSlider onOpenHoldModal={() => setShowHoldModal(true)} />
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ProductCatalogGrid />
        </div>
      </main>

      {/* Right-Side Slide-Over Hold Bills / Bill History Drawer Panel */}
      {showHoldModal && (
        <HoldOrdersModal onClose={() => setShowHoldModal(false)} />
      )}
    </div>
  );
}
