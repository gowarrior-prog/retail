'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Printer } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { showProfessionalAlert } from '@/lib/alert';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';
import ThermalReceiptContent from './ThermalReceiptContent';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PaymentModal({ onClose }: { onClose: () => void }) {
  const { items, grandTotal, subtotal, discountTotal, clearCart, cashierName } = useCartStore();
  const total = grandTotal();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [tendered, setTendered] = useState<number>(total);
  const [sendDigitalReceipt, setSendDigitalReceipt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeDue = Math.max(0, tendered - total);
  const currentCashier = cashierName || 'Admin';

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const handleProcessCheckout = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      const checkoutPayload = {
        invoice_number: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
        items: items.map((i) => ({
          product_id: i.id, product_name: i.name, price: i.price, unit_price: i.price, quantity: i.quantity,
          discount: i.discount, line_total: i.price * i.quantity * (1 - i.discount / 100)
        })),
        amount_paid: total, total_amount: total, amount_tendered: tendered, cash_paid: tendered, cash_change: changeDue,
        discount: discountTotal(), tax: 0, payment_mode: paymentMethod, cashier_name: currentCashier, customer_phone: '03000000000',
      };

      // 1. Process Checkout
      const res = await posCheckout(checkoutPayload);
      const invoiceNum = res.invoice_number || checkoutPayload.invoice_number;

      const printPayload = {
        invoice_number: invoiceNum,
        items: checkoutPayload.items, subtotal: subtotal(), discount_total: discountTotal(),
        tax_total: 0, grand_total: total, cash_paid: tendered, cash_change: changeDue,
        payment_mode: paymentMethod, customer_name: 'Walk-in Customer', customer_phone: '',
        cashier_name: currentCashier,
      };

      // 2. Direct Raw Print to Speed-X printer
      try {
        await fetch(`${API_URL}/printer/print-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(printPayload),
        });
      } catch (printErr) {
        console.error('Direct print error:', printErr);
      }

      // 3. Play Success Audio Chime & White Toast
      playToastAudio('print');
      showCatalogToast('Bill printed & checkout completed!', 'add');

      // 4. Clear Cart & Close Modal without opening additional page/modal
      clearCart();
      handleAnimatedClose();
    } catch (err: any) {
      showProfessionalAlert(err.message || 'Error processing transaction', 'Checkout Notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewReceipt = {
    invoice_number: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, line_total: i.price * i.quantity * (1 - (i.discount || 0) / 100) })),
    subtotal: subtotal(),
    discount_total: discountTotal(),
    grand_total: total,
    cash_paid: tendered,
    cash_change: changeDue,
    payment_mode: paymentMethod,
    customer_name: 'Walk-in Customer',
    cashier_name: currentCashier
  };

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-[#377462] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8  text-white flex items-center justify-center font-bold text-sm">
            </div>
            <div>
              <h3 className="font-bold text-base leading-none text-white tracking-wide">Complete Payment & Print Bill</h3>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1.5 text-emerald-200 hover:text-green- rounded-lg cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Left Controls */}
          <div className="flex flex-col gap-4">
          
            {/* Net Payable Banner */}
            <div className="bg-gray-200 rounded-xl p-4 border  flex items-center justify-between text-white shadow-sm ">
              <span className="text-xs font-semibold uppercase tracking-wider font-sans text-black">Net Payable:</span>
              <span className="text-2xl font-bold font-mono text-black">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={handleProcessCheckout}
              disabled={isSubmitting}
              className=" w-full bg-[#e1e4e3] hover:bg-[#c8cbca] active:scale-[0.99] text-black py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition tracking-wide"
            >
              <Printer className="w-5 h-5 text-emerald-400" />
              <span>{isSubmitting ? 'Processing Transaction...' : 'Validate & Print Bill'}</span>
            </button>
          </div>

          {/* Right Receipt Live Preview */}
          <div className="bg-slate-200 p-3.5 rounded-xl border border-slate-300 flex justify-center max-h-[70vh] overflow-y-auto">
            <ThermalReceiptContent receiptData={previewReceipt} />
          </div>
        </div>
      </div>
    </div>
  );
}
