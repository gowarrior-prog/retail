'use client';

import { useState } from 'react';
import { useCartStore } from '@/stores/useCartStore';
import CartItemsList from './CartItemsList';
import CartKeypad from './CartKeypad';
import PaymentModal from './PaymentModal';
import SplitBillModal from './SplitBillModal';
import SalesReturnModal from './SalesReturnModal';
import HoldOrdersModal from './HoldOrdersModal';
import ThermalReceiptModal from './ThermalReceiptModal';

export default function LeftRegisterPanel() {
  const {
    items,
    subtotal,
    grandTotal,
    tenderedAmount,
    setTenderedAmount,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  const [activeMode, setActiveMode] = useState<'QTY' | 'DISC' | 'PRICE'>('QTY');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);

  const handleKeypadPress = (val: string) => {
    if (val === 'Qty') { setActiveMode('QTY'); setKeypadBuffer(''); return; }
    if (val === 'Disc') { setActiveMode('DISC'); setKeypadBuffer(''); return; }
    if (val === 'Price') { setActiveMode('PRICE'); setKeypadBuffer(''); return; }

    const cart = useCartStore.getState();
    const selectedItem = items.find(i => i.id === selectedItemId) || items[0];

    if (!selectedItem) {
      if (val === 'DELETE') setTenderedAmount(tenderedAmount.slice(0, -1));
      else setTenderedAmount(tenderedAmount + val);
      return;
    }

    let newBuffer = keypadBuffer;
    if (val === 'DELETE') {
      newBuffer = newBuffer.slice(0, -1);
    } else {
      newBuffer += val;
    }

    setKeypadBuffer(newBuffer);
    const numVal = parseFloat(newBuffer) || 0;

    if (activeMode === 'QTY') {
      if (numVal > 0) cart.updateQuantity(selectedItem.id, numVal);
    } else if (activeMode === 'DISC') {
      cart.setItemDiscount(selectedItem.id, Math.min(100, Math.max(0, numVal)));
    } else if (activeMode === 'PRICE') {
      cart.updatePrice(selectedItem.id, numVal);
    }
  };

  const activeGrandTotal = grandTotal();

  return (
    <section className="w-full lg:w-[380px] xl:w-[410px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full shadow-sm z-10 overflow-hidden font-sans">
      {/* Active Cart Items List */}
      <CartItemsList
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={(id) => { setSelectedItemId(id); setKeypadBuffer(''); }}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={() => { if (confirm('Cancel this entire order and clear the cart?')) clearCart(); }}
      />

      {/* Cart Summary & Keypad Section - Tall & Spacious for POS */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 shrink-0">      

        {/* Dark Green NET PAYABLE Banner (Tall Height) */}
        <div className="bg-[#ffffff] text-black p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-black font-bold uppercase tracking-wider block leading-tight">NET PAYABLE</span>
          </div>
          <span className="text-2xl font-black  font-mono tracking-tight text-black">
            Rs. {activeGrandTotal.toLocaleString()}
          </span>
        </div>

        {/* Action Buttons: Return & Split (Tall Height, Clean Text) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setShowReturnModal(true)}
            className="py-3 bg-white hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center cursor-pointer shadow-2xs transition-all"
          >
            Return
          </button>
          <button
            onClick={() => setShowSplitModal(true)}
            className="py-3 bg-white hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center cursor-pointer shadow-2xs transition-all"
          >
            Split
          </button>
        </div>

        {/* Numpad */}
        <CartKeypad activeMode={activeMode} onKeypadPress={handleKeypadPress} />

        {/* Large Pay & Checkout Button (Extra Tall Height) */}
        <button
          onClick={() => setShowPaymentModal(true)}
          disabled={items.length === 0}
          className="w-full bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] disabled:opacity-50 text-white rounded-2xl py-3.5 font-bold text-base tracking-wide flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <span>Checkout</span>
        </button>

        {/* Clear Cart Button */}
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-slate-400 hover:text-rose-600 font-bold text-xs transition cursor-pointer flex items-center justify-center py-1"
          >
            Clear Cart
          </button>
        )}
      </div>

      {/* Modals */}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
      {showSplitModal && <SplitBillModal onClose={() => setShowSplitModal(false)} onProceedToSplitCheckout={() => {}} />}
      {showReturnModal && <SalesReturnModal onClose={() => setShowReturnModal(false)} />}
      {showHoldModal && <HoldOrdersModal onClose={() => setShowHoldModal(false)} />}
      {checkoutSuccess && <ThermalReceiptModal receiptData={checkoutSuccess} onClose={() => { setCheckoutSuccess(null); clearCart(); }} />}
    </section>
  );
}
