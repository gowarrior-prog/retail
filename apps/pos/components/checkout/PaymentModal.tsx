'use client';

import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Wallet,
  CreditCard,
  BookOpen,
  ArrowRight,
  Printer,
  Receipt,
  Tag,
  Percent,
} from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';

interface PaymentModalProps {
  onClose: () => void;
}

export default function PaymentModal({ onClose }: PaymentModalProps) {
  const {
    items,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    paymentMode,
    setPaymentMode,
    customerName,
    customerPhone,
    cashierName,
    clearCart,
  } = useCartStore();

  const totalPayable = grandTotal();
  const [tenderedInput, setTenderedInput] = useState<string>(totalPayable.toString());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  const tenderedAmountNum = parseFloat(tenderedInput) || 0;
  const changeDueNum = Math.max(0, tenderedAmountNum - totalPayable);

  const handleQuickTender = (amount: number) => {
    setTenderedInput(amount.toString());
  };

  const handleNumpadKey = (key: string) => {
    if (key === 'C') {
      setTenderedInput('');
    } else if (key === 'BACK') {
      setTenderedInput((prev) => prev.slice(0, -1));
    } else if (key === 'EXACT') {
      setTenderedInput(totalPayable.toString());
    } else {
      setTenderedInput((prev) => prev + key);
    }
  };

  const handleValidateCheckout = async (shouldPrint: boolean = true) => {
    if (items.length === 0) return;

    if (paymentMode === 'CASH' && tenderedAmountNum < totalPayable) {
      alert(`Tendered amount (${formatCurrency(tenderedAmountNum)}) is less than Grand Total (${formatCurrency(totalPayable)}).`);
      return;
    }

    if (paymentMode === 'CREDIT_KHATA' && !customerPhone) {
      alert('Please enter Client Phone number for Credit Khata transaction.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        store_id: 'store-1',
        cashier_name: cashierName || 'Cashier',
        customer_phone: customerPhone || null,
        customer_name: customerName || 'Walk-in Client',
        payment_mode: paymentMode || 'CASH',
        amount_paid: totalPayable,
        amount_tendered: tenderedAmountNum || totalPayable,
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

      const res = await posCheckout(payload);
      setIsProcessing(false);

      if (shouldPrint) {
        setCheckoutResult(res);
      } else {
        // Direct New Order
        clearCart();
        onClose();
      }
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Checkout Notice: ${err.message || 'Saved in local offline database.'}`);
      if (!shouldPrint) {
        clearCart();
        onClose();
      }
    }
  };

  const handleFinishAndNewOrder = () => {
    setCheckoutResult(null);
    clearCart();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Payment & Billing Checkout</h3>
                <p className="text-[11px] text-slate-500 font-medium">Select payment mode and validate order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Grid: Left Items Summary & Right Payment Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto min-h-0">
            {/* Left Column: Order Bill Summary (5 cols) */}
            <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                <span>ORDER ITEMS ({items.length})</span>
                <span className="text-slate-500 font-mono">Client: {customerName || 'Walk-in'}</span>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden max-h-56 overflow-y-auto shadow-2xs divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Rs. {item.price} x {item.quantity}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 shrink-0">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Card */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col gap-2 shadow-sm mt-auto">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">{formatCurrency(subtotal())}</span>
                </div>

                {discountTotal() > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5" /> Discount
                    </span>
                    <span className="font-mono font-bold">-{formatCurrency(discountTotal())}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-sm text-amber-400">PAYABLE TOTAL</span>
                  <span className="font-mono text-2xl font-black text-white">{formatCurrency(totalPayable)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Mode & Cash Tender Numpad (7 cols) */}
            <div className="md:col-span-7 p-4 flex flex-col gap-4 overflow-y-auto">
              {/* Payment Mode Selector Tabs */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700">SELECT PAYMENT MODE</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => setPaymentMode('CASH')}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer',
                      paymentMode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs font-bold">Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('CARD')}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer',
                      paymentMode === 'CARD'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-bold">Card / POS</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('BANK')}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer',
                      paymentMode === 'BANK'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-bold">Bank / Jazz</span>
                  </button>

                  <button
                    onClick={() => setPaymentMode('CREDIT_KHATA')}
                    className={cn(
                      'p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer',
                      paymentMode === 'CREDIT_KHATA'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-xs font-bold">Khata</span>
                  </button>
                </div>
              </div>

              {/* Cash Tender & Numpad section */}
              {paymentMode === 'CASH' && (
                <div className="flex flex-col gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {/* Quick Tender Cash Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">QUICK TENDER:</span>
                    <button
                      onClick={() => handleQuickTender(totalPayable)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-300 transition"
                    >
                      Exact (Rs. {totalPayable})
                    </button>
                    {[500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleQuickTender(amt)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition"
                      >
                        Rs. {amt}
                      </button>
                    ))}
                  </div>

                  {/* Cash Input & Change Returned */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">CASH TENDERED (RECEIVED)</label>
                      <input
                        type="text"
                        value={tenderedInput}
                        onChange={(e) => setTenderedInput(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">CHANGE RETURNED (DUE)</label>
                      <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg font-mono text-base font-black text-emerald-700">
                        {formatCurrency(changeDueNum)}
                      </div>
                    </div>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {['7', '8', '9', 'C', '4', '5', '6', 'BACK', '1', '2', '3', 'EXACT'].map((k) => (
                      <button
                        key={k}
                        onClick={() => handleNumpadKey(k)}
                        className={cn(
                          'py-2 rounded-lg font-mono font-bold text-sm border transition active:scale-95 cursor-pointer',
                          k === 'C'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            : k === 'BACK'
                            ? 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                            : k === 'EXACT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-sans text-xs'
                            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {k === 'BACK' ? '⌫' : k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons: Validate & Print vs Validate & Skip Print (Direct New Order) */}
              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={() => handleValidateCheckout(true)}
                  disabled={isProcessing || items.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-md border border-emerald-700 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Processing Checkout...</span>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>VALIDATE & PRINT THERMAL BILL (Rs. {totalPayable.toLocaleString()})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleValidateCheckout(false)}
                  disabled={isProcessing || items.length === 0}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs tracking-wide rounded-xl border border-slate-900 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  <span>VALIDATE & SKIP PRINT → DIRECT NEW ORDER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Thermal Receipt Modal */}
      {checkoutResult && (
        <ThermalReceiptModal
          receiptData={{
            invoice_number: checkoutResult.invoice_number || 'INV-001',
            items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
            subtotal: checkoutResult.subtotal || totalPayable,
            discount_total: checkoutResult.discount_total || 0,
            tax_total: checkoutResult.tax_total || 0,
            grand_total: checkoutResult.grand_total || totalPayable,
            cash_paid: tenderedAmountNum || totalPayable,
            cash_change: checkoutResult.change_returned || changeDueNum,
            payment_mode: paymentMode || 'CASH',
            customer_name: customerName,
            customer_phone: customerPhone,
            cashier_name: cashierName,
          }}
          onClose={handleFinishAndNewOrder}
        />
      )}
    </>
  );
}
