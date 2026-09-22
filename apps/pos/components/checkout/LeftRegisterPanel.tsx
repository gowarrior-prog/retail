'use client';

import { useState } from 'react';
import { FileText, RotateCcw, Layers, GitFork, ChevronRight } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import CartItemsList from './CartItemsList';
import CartKeypad from './CartKeypad';
import ThermalReceiptModal from './ThermalReceiptModal';
import PaymentModal from './PaymentModal';
import OrderNoteModal from './OrderNoteModal';
import SplitBillModal from './SplitBillModal';
import SalesReturnModal from './SalesReturnModal';
import HoldOrdersModal from './HoldOrdersModal';

export default function LeftRegisterPanel() {
  const {
    items,
    subtotal,
    discountTotal,
    grandTotal,
    changeDue,
    tenderedAmount,
    setTenderedAmount,
    updateQuantity,
    removeItem,
    paymentMode,
    customerName,
    customerPhone,
    orderNote,
    clearCart,
    holdCurrentOrder,
    heldBills,
    cashierName,
  } = useCartStore();

  const [activeMode, setActiveMode] = useState<'QTY' | 'DISC' | 'PRICE'>('QTY');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [splitConfig, setSplitConfig] = useState<{ cashPart: number; digitalPart: number; digitalMode: string } | undefined>(undefined);

  const handleKeypadPress = (val: string) => {
    if (val === 'Qty') { setActiveMode('QTY'); setKeypadBuffer(''); return; }
    if (val === 'Disc') { setActiveMode('DISC'); setKeypadBuffer(''); return; }
    if (val === 'Price') { setActiveMode('PRICE'); setKeypadBuffer(''); return; }

    const cart = useCartStore.getState();
    const selectedItem = items.find(i => i.id === selectedItemId) || items[0];

    if (!selectedItem) {
      if (val === 'DELETE') setTenderedAmount(tenderedAmount.slice(0, -1));
      else if (val !== '+/-') setTenderedAmount(tenderedAmount + val);
      return;
    }

    let newBuffer = keypadBuffer;
    if (val === 'DELETE') {
      newBuffer = newBuffer.slice(0, -1);
    } else if (val === '+/-') {
      newBuffer = newBuffer.startsWith('-') ? newBuffer.slice(1) : '-' + newBuffer;
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

  const handleHoldOrderClick = () => {
    if (items.length > 0) {
      const held = holdCurrentOrder();
      if (held) {
        alert('Order parked / held successfully! You can resume it anytime from Held Orders.');
      }
    } else {
      setShowHoldModal(true);
    }
  };

  const activeGrandTotal = grandTotal();

  return (
    <section className="w-full lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full shadow-sm z-10 overflow-hidden">
      {/* Active Cart Items List */}
      <CartItemsList
        items={items}
        selectedItemId={selectedItemId}
        onSelectItem={(id) => { setSelectedItemId(id); setKeypadBuffer(''); }}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={() => { if (confirm('Cancel this entire order and clear the cart?')) clearCart(); }}
      />

      {/* Totals & Touch Keypad */}
      <div className="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between items-center text-xs font-mono text-slate-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal())}</span>
        </div>

        <div className="flex justify-between items-center text-sm sm:text-base font-bold text-slate-900 border-t border-slate-200/80 pt-1">
          <span className="text-xs uppercase font-sans font-bold text-slate-700">Total Payable</span>
          <span className="font-mono text-emerald-700 text-base sm:text-lg">{formatCurrency(activeGrandTotal)}</span>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-1">
          <button onClick={() => setShowNoteModal(true)} className="py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1 cursor-pointer">
            <FileText className="w-3 h-3 text-indigo-600" /> Note
          </button>
          <button onClick={() => setShowReturnModal(true)} className="py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-rose-700 flex items-center justify-center gap-1 cursor-pointer">
            <RotateCcw className="w-3 h-3 text-rose-600" /> Return
          </button>
          <button onClick={handleHoldOrderClick} className="py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-amber-700 flex items-center justify-center gap-1 cursor-pointer relative">
            <Layers className="w-3 h-3 text-amber-600" /> Bills
            {heldBills.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center font-mono font-bold">{heldBills.length}</span>}
          </button>
          <button onClick={() => setShowSplitModal(true)} className="py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-purple-700 flex items-center justify-center gap-1 cursor-pointer">
            <GitFork className="w-3 h-3 text-purple-600" /> Split
          </button>
        </div>

        {/* Payment & Touch Keypad */}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={items.length === 0 || isProcessing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl p-2.5 font-bold flex flex-col justify-between items-center transition shadow-xs cursor-pointer"
          >
            <ChevronRight className="w-6 h-6 stroke-[3]" />
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-wider block font-bold text-emerald-100">PAYMENT</span>
              <span className="text-xs font-mono font-bold">{formatCurrency(activeGrandTotal)}</span>
            </div>
          </button>

          <div className="w-[200px] sm:w-[230px]">
            <CartKeypad activeMode={activeMode} onKeypadPress={handleKeypadPress} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
      {showNoteModal && <OrderNoteModal onClose={() => setShowNoteModal(false)} />}
      {showSplitModal && <SplitBillModal onClose={() => setShowSplitModal(false)} onProceedToSplitCheckout={(cfg: any) => setSplitConfig(cfg)} />}
      {showReturnModal && <SalesReturnModal onClose={() => setShowReturnModal(false)} />}
      {showHoldModal && <HoldOrdersModal onClose={() => setShowHoldModal(false)} />}
      {checkoutSuccess && <ThermalReceiptModal receiptData={checkoutSuccess} onClose={() => { setCheckoutSuccess(null); clearCart(); }} />}
    </section>
  );
}
