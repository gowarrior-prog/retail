'use client';
import { useEffect } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import CheckoutSummary from '@/components/checkout/CheckoutSummary';
import PaymentKeypad from '@/components/checkout/PaymentKeypad';
import BarcodeScanner from '@/components/checkout/BarcodeScanner';
import CartItemList from '@/components/checkout/CartItemList';
import QuickActionsToolbar from '@/components/checkout/QuickActionsToolbar';

export default function CheckoutPage() {
  const { loadProducts } = useProductStore();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="h-[calc(100vh-5rem)] overflow-hidden flex flex-col lg:flex-row gap-4 p-1">
      {/* Left Column: Summary & Payment Keypad (Fixed fit) */}
      <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0 flex flex-col gap-3 overflow-y-auto max-h-full pr-1">
        <CheckoutSummary />
        <PaymentKeypad />
      </div>

      {/* Right Column: Barcode Scanner, Cart Items & Actions */}
      <div className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto max-h-full pl-1">
        <BarcodeScanner />
        <CartItemList />
        <QuickActionsToolbar />
      </div>
    </div>
  );
}
