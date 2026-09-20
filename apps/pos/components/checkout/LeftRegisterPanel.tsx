'use client';

import { useState } from 'react';
import {
  Receipt,
  ShoppingCart,
  FileText,
  RotateCcw,
  Layers,
  GitFork,
  ChevronRight,
  Delete,
  Plus,
  Minus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
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

  // Keypad press handler
  const handleKeypadPress = (val: string) => {
    // Mode changing
    if (val === 'Qty') { setActiveMode('QTY'); setKeypadBuffer(''); return; }
    if (val === 'Disc') { setActiveMode('DISC'); setKeypadBuffer(''); return; }
    if (val === 'Price') { setActiveMode('PRICE'); setKeypadBuffer(''); return; }
    
    // Find selected item if any
    const selectedItem = items.find(i => i.id === selectedItemId) || items[0];

    // If no item in cart, update tendered amount
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
      if (val === '.' && newBuffer.includes('.')) return;
      newBuffer = newBuffer + val;
    }

    setKeypadBuffer(newBuffer);
    const numVal = parseFloat(newBuffer) || 0;

    const cart = useCartStore.getState();

    if (activeMode === 'QTY') {
      cart.updateQuantity(selectedItem.id, Math.max(0, Math.round(numVal)));
    } else if (activeMode === 'DISC') {
      cart.setItemDiscount(selectedItem.id, numVal);
    } else if (activeMode === 'PRICE') {
      cart.updatePrice(selectedItem.id, numVal);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setKeypadBuffer('');
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

  const handleClearCartClick = () => {
    if (items.length === 0) return;
    if (confirm('Cancel this entire order and clear the cart?')) {
      clearCart();
    }
  };

  const handleFinishTransaction = () => {
    setCheckoutSuccess(null);
    clearCart();
  };

  const activeGrandTotal = grandTotal();

  // Common keypad button style
  const numBtnClass = "bg-white hover:bg-slate-200 active:bg-slate-300 rounded-lg border border-slate-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9";
  const modeBtnClass = (mode: string) =>
    `rounded-lg font-bold text-[10px] sm:text-xs tracking-wider border flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9 ${
      activeMode === mode
        ? 'bg-emerald-600 text-white border-emerald-700'
        : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
    }`;

  return (
    <section className="w-full lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full shadow-sm z-10 overflow-hidden">
      {/* Top Section: Order Header & Cart Items List */}
      <div className="flex-1 overflow-y-auto flex flex-col p-2.5 sm:p-3 divide-y divide-slate-100 min-h-0">
        {/* Order Header */}
        <div className="flex items-center justify-between pb-2 text-xs text-slate-500 font-medium shrink-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-800">Active Register</span>
          </div>

          <div className="flex items-center gap-1.5">
            {items.length > 0 && (
              <button
                onClick={handleClearCartClick}
                className="px-2 py-0.5 rounded text-[10.5px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                title="Cancel Order & Empty Cart"
              >
                <XCircle className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10.5px] font-semibold">
              Ready
            </span>
          </div>
        </div>

        {/* Active Cart Items */}
        <div className="py-2 space-y-1.5 flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                Scan barcode or select items from catalog
              </p>
            </div>
          ) : (
            items.map((item: CartItem, idx: number) => {
              const lineTotal = item.price * item.quantity * (1 - item.discount / 100);
              const isSelected = selectedItemId === item.id || (idx === 0 && !selectedItemId);
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item.id)}
                  className={`p-2 rounded-lg border transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 pr-2 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">{item.name}</h4>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 font-mono">
                      {item.quantity} × <span className="font-semibold text-slate-700">{formatCurrency(item.price)}</span>
                      {item.discount > 0 && <span className="text-emerald-700 ml-1">({item.discount}% off)</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold cursor-pointer"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold font-mono">{item.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-emerald-800 font-mono min-w-[55px] text-right">
                      Rs. {lineTotal.toLocaleString()}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Note indicator if set */}
      {orderNote && (
        <div className="px-3 py-1 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-[11px] text-amber-900 shrink-0">
          <span className="truncate italic">
            <span className="font-bold">Note:</span> {orderNote}
          </span>
          <button
            onClick={() => setShowNoteModal(true)}
            className="text-[10px] font-bold text-amber-700 underline cursor-pointer shrink-0 ml-1"
          >
            Edit
          </button>
        </div>
      )}

      {/* Financial Totals - 100% Tax Free! */}
      <div className="px-3 py-2 bg-slate-50 border-t border-b border-slate-200 shrink-0 text-xs">
        <div className="flex justify-between py-0.5 text-slate-500">
          <span>Subtotal</span>
          <span className="font-medium text-slate-700 font-mono">Rs. {subtotal().toLocaleString()}</span>
        </div>
        {discountTotal() > 0 && (
          <div className="flex justify-between py-0.5 text-emerald-600">
            <span>Discount</span>
            <span className="font-medium font-mono">-Rs. {discountTotal().toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-slate-900 mt-0.5">
          <span>Total Payable</span>
          <span className="text-base text-emerald-700 font-mono font-black">
            Rs. {activeGrandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 4 Functional Action Buttons Row */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
        {/* Note Button */}
        <button
          onClick={() => setShowNoteModal(true)}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded border transition shadow-2xs cursor-pointer text-[11px] font-semibold ${
            orderNote
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
          title="Add Order Note / Remarks"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Note</span>
        </button>

        {/* Sales Return / Refund Button */}
        <button
          onClick={() => setShowReturnModal(true)}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold"
          title="Sales Return & Bill Refund"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
          <span>Return</span>
        </button>

        {/* Hold / Bill Park Button */}
        <button
          onClick={handleHoldOrderClick}
          className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded border transition shadow-2xs cursor-pointer text-[11px] font-semibold ${
            heldBills.length > 0
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
          title={items.length > 0 ? 'Hold / Park Current Cart' : 'View Parked Bills'}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            {items.length > 0 ? 'Hold' : 'Bills'}
            {heldBills.length > 0 ? ` (${heldBills.length})` : ''}
          </span>
        </button>

        {/* Split Bill Button */}
        <button
          onClick={() => {
            if (items.length === 0) {
              alert('Cart is empty! Add items first to split bill.');
              return;
            }
            setShowSplitModal(true);
          }}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold"
          title="Split Bill (Cash + Card/Jazz)"
        >
          <GitFork className="w-3.5 h-3.5 text-slate-500" />
          <span>Split</span>
        </button>
      </div>

      {/* Keypad & Big Green PAYMENT Trigger */}
      <div className="p-1.5 sm:p-2 bg-slate-100 shrink-0 flex gap-1.5 touch-action-none">
        {/* Large Green PAYMENT Trigger Button */}
        <div className="flex flex-col shrink-0">
          <button
            onClick={() => {
              if (items.length === 0) {
                alert('Cart is empty! Select items from the catalog first.');
                return;
              }
              setSplitConfig(undefined);
              setShowPaymentModal(true);
            }}
            disabled={isProcessing || items.length === 0}
            className="flex-1 w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-md border border-emerald-700 flex flex-col items-center justify-center px-3 sm:px-4 py-2 transition group cursor-pointer disabled:opacity-50"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center mb-0.5 group-hover:scale-105 transition transform">
              <ChevronRight className="w-5 h-5 text-white stroke-[3]" />
            </div>
            <span className="text-[11px] sm:text-xs tracking-wide uppercase font-extrabold">Payment</span>
            <span className="text-[9px] sm:text-[10px] font-medium text-emerald-100 font-mono">
              Rs. {activeGrandTotal.toLocaleString()}
            </span>
          </button>
        </div>

        {/* 4x4 Keypad Grid */}
        <div className="flex-1 grid grid-cols-4 gap-1 font-bold text-slate-700 min-w-0">
          <button onClick={() => handleKeypadPress('1')} className={numBtnClass}>1</button>
          <button onClick={() => handleKeypadPress('2')} className={numBtnClass}>2</button>
          <button onClick={() => handleKeypadPress('3')} className={numBtnClass}>3</button>
          <button onClick={() => handleKeypadPress('Qty')} className={modeBtnClass('QTY')}>Qty</button>

          <button onClick={() => handleKeypadPress('4')} className={numBtnClass}>4</button>
          <button onClick={() => handleKeypadPress('5')} className={numBtnClass}>5</button>
          <button onClick={() => handleKeypadPress('6')} className={numBtnClass}>6</button>
          <button onClick={() => handleKeypadPress('Disc')} className={modeBtnClass('DISC')}>Disc</button>

          <button onClick={() => handleKeypadPress('7')} className={numBtnClass}>7</button>
          <button onClick={() => handleKeypadPress('8')} className={numBtnClass}>8</button>
          <button onClick={() => handleKeypadPress('9')} className={numBtnClass}>9</button>
          <button onClick={() => handleKeypadPress('Price')} className={modeBtnClass('PRICE')}>Price</button>

          <button onClick={() => handleKeypadPress('+/-')} className={numBtnClass}>+/-</button>
          <button onClick={() => handleKeypadPress('0')} className={numBtnClass}>0</button>
          <button onClick={() => handleKeypadPress('.')} className={numBtnClass}>.</button>
          <button onClick={() => handleKeypadPress('DELETE')} className="bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-lg border border-rose-200 flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-9" title="Backspace">
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Payment Drawer Modal */}
      {showPaymentModal && (
        <PaymentModal
          splitConfig={splitConfig}
          onClose={() => {
            setShowPaymentModal(false);
            setSplitConfig(undefined);
          }}
        />
      )}

      {/* Order Note Modal */}
      {showNoteModal && (
        <OrderNoteModal onClose={() => setShowNoteModal(false)} />
      )}

      {/* Split Bill Modal */}
      {showSplitModal && (
        <SplitBillModal
          onClose={() => setShowSplitModal(false)}
          onProceedToSplitCheckout={(cfg) => {
            setSplitConfig(cfg);
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Sales Return & Refund Modal */}
      {showReturnModal && (
        <SalesReturnModal onClose={() => setShowReturnModal(false)} />
      )}

      {/* Parked / Held Orders Modal */}
      {showHoldModal && (
        <HoldOrdersModal onClose={() => setShowHoldModal(false)} />
      )}

      {/* Direct Thermal Receipt Modal */}
      {checkoutSuccess && (
        <ThermalReceiptModal
          receiptData={{
            invoice_number: checkoutSuccess.invoice_number || 'INV-001',
            items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: activeGrandTotal,
            discount_total: discountTotal(),
            tax_total: 0,
            grand_total: activeGrandTotal,
            cash_paid: parseFloat(tenderedAmount) || activeGrandTotal,
            cash_change: checkoutSuccess.change_returned || changeDue(),
            payment_mode: paymentMode || 'CASH',
            customer_name: customerName,
            customer_phone: customerPhone,
            cashier_name: cashierName,
          }}
          onClose={handleFinishTransaction}
        />
      )}
    </section>
  );
}
