'use client';
import { useState } from 'react';
import {
  Receipt,
  ShoppingCart,
  FileText,
  Users,
  Printer,
  GitFork,
  UserCheck,
  ChevronRight,
  Delete,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';

export default function LeftRegisterPanel() {
  const {
    items,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    changeDue,
    tenderedAmount,
    setTenderedAmount,
    updateQuantity,
    removeItem,
    paymentMode,
    customerName,
    customerPhone,
    clearCart,
    cashierName,
  } = useCartStore();

  const [activeMode, setActiveMode] = useState<'QTY' | 'DISC' | 'PRICE'>('QTY');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');

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
      // Prevent multiple dots
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

  // Reset buffer when selected item changes
  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setKeypadBuffer('');
  };

  const handlePaymentCheckout = async () => {
    if (items.length === 0) {
      alert('Cart is empty! Select items from the catalog first.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        store_id: 'store-1',
        cashier_name: cashierName || 'Cashier',
        customer_phone: customerPhone || null,
        customer_name: customerName || 'Walk-in Customer',
        payment_mode: paymentMode || 'CASH',
        amount_paid: parseFloat(tenderedAmount) || grandTotal(),
        amount_tendered: parseFloat(tenderedAmount) || grandTotal(),
        items: items.map((item: CartItem) => ({
          product_id: item.id,
          product_name: item.name,
          price: item.price,
          unit_price: item.price,
          cost_price: item.cost_price || 0,
          quantity: item.quantity,
          discount_percentage: item.discount,
        })),
      };

      const result = await posCheckout(payload);
      setCheckoutSuccess(result);
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Checkout Error: ${err.message || 'Failed to complete transaction'}`);
    }
  };

  const handleFinishTransaction = () => {
    setCheckoutSuccess(null);
    clearCart();
  };

  const activeGrandTotal = grandTotal();

  // Common keypad button style
  const numBtnClass = "bg-white hover:bg-slate-200 active:bg-slate-300 rounded-lg border border-slate-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-10";
  const modeBtnClass = (mode: string) =>
    `rounded-lg font-bold text-[10px] sm:text-xs tracking-wider border flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-10 ${
      activeMode === mode
        ? 'bg-emerald-600 text-white border-emerald-700'
        : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
    }`;

  return (
    <section className="w-full lg:w-[380px] xl:w-[420px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full shadow-sm z-10 overflow-hidden">
      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto flex flex-col p-2.5 sm:p-3 divide-y divide-slate-100 min-h-0">
        {/* Order Header */}
        <div className="flex items-center justify-between pb-2 text-xs text-slate-500 font-medium shrink-0">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            Order #ORD-2026-0924
          </span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10.5px] font-semibold">
            In Progress
          </span>
        </div>

        {/* Active Cart Items */}
        <div className="py-2 space-y-1.5 flex-1 overflow-y-auto min-h-0">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">This order is empty</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                Select items from the catalog or scan a barcode
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
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity - 1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold font-mono">{item.quantity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:bg-white rounded font-bold"
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
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
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

      {/* Financial Totals */}
      <div className="px-3 py-2 bg-slate-50 border-t border-b border-slate-200 shrink-0 text-xs">
        <div className="flex justify-between py-0.5 text-slate-500">
          <span>Subtotal</span>
          <span className="font-medium text-slate-700 font-mono">Rs. {subtotal().toLocaleString()}</span>
        </div>
        <div className="flex justify-between py-0.5 text-slate-500">
          <span>Taxes</span>
          <span className="font-medium text-slate-700 font-mono">Rs. {taxTotal().toLocaleString()}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-slate-900 mt-0.5">
          <span>Total</span>
          <span className="text-base text-emerald-700 font-mono font-black">
            Rs. {activeGrandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 border-b border-slate-200 shrink-0">
        <button className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Note</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Guest</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold">
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Bill</span>
        </button>
        <button className="flex items-center justify-center gap-1 py-1.5 px-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer text-[11px] font-semibold">
          <GitFork className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Split</span>
        </button>
      </div>

      {/* Customer Selector Row */}
      <div className="px-3 py-1.5 bg-white flex items-center justify-between border-b border-slate-200 shrink-0">
        <button className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 py-0.5 px-1 rounded hover:bg-slate-100 transition w-full text-left cursor-pointer">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <div className="flex-1 truncate">
            <span className="text-slate-400 font-normal">Customer:</span>
            <span className="text-slate-900 ml-1 font-bold">
              {customerName || 'Walk-In Customer'}
            </span>
          </div>
        </button>
      </div>

      {/* Keypad & Big Green PAYMENT Trigger */}
      <div className="p-1.5 sm:p-2 bg-slate-100 shrink-0 flex gap-1.5 touch-action-none">
        {/* Large Green PAYMENT Trigger Button */}
        <div className="flex flex-col shrink-0">
          <button
            onClick={handlePaymentCheckout}
            disabled={isProcessing || items.length === 0}
            className="flex-1 w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-md border border-emerald-700 flex flex-col items-center justify-center px-3 sm:px-4 py-2 transition group cursor-pointer disabled:opacity-50"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-105 transition transform">
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[3]" />
            </div>
            <span className="text-[11px] sm:text-sm tracking-wide uppercase font-extrabold">Payment</span>
            <span className="text-[9px] sm:text-[10.5px] font-medium text-emerald-100 mt-0.5 font-mono">
              Rs. {activeGrandTotal.toLocaleString()}
            </span>
          </button>
        </div>

        {/* 4x4 Keypad Grid - responsive */}
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
          <button onClick={() => handleKeypadPress('DELETE')} className="bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-lg border border-rose-200 flex items-center justify-center cursor-pointer transition-colors select-none aspect-square sm:aspect-auto sm:h-10" title="Backspace">
            <Delete className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {checkoutSuccess && (
        <ThermalReceiptModal
          receiptData={{
            invoice_number: checkoutSuccess.invoice_number || 'INV-001',
            items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: checkoutSuccess.subtotal || grandTotal(),
            discount_total: checkoutSuccess.discount_total || 0,
            tax_total: checkoutSuccess.tax_total || 0,
            grand_total: checkoutSuccess.grand_total || grandTotal(),
            cash_paid: parseFloat(tenderedAmount) || grandTotal(),
            cash_change: checkoutSuccess.change_returned || changeDue(),
            payment_mode: paymentMode || 'CASH',
            customer_name: customerName,
            customer_phone: customerPhone,
          }}
          onClose={handleFinishTransaction}
        />
      )}
    </section>
  );
}
