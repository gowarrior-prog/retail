'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight, Printer } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { posCheckout, fetchKhata } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';
import PaymentModeButtons from './PaymentModeButtons';
import PaymentCustomerSelect from './PaymentCustomerSelect';

export default function PaymentModal({ onClose }: { onClose: () => void }) {
  const {
    items, grandTotal, tenderedAmount, setTenderedAmount,
    paymentMode, setPaymentMode, customerName, setCustomerName,
    customerPhone, setCustomerPhone, orderNote, clearCart, cashierName
  } = useCartStore();

  const total = grandTotal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const [khataCustomers, setKhataCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<any | null>(null);
  const [showNewCustInput, setShowNewCustInput] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  useEffect(() => {
    fetchKhata().then((res) => setKhataCustomers(res || [])).catch(() => {});
  }, []);

  const filteredKhatas = khataCustomers.filter((k) => {
    if (!customerSearch.trim()) return false;
    const q = customerSearch.toLowerCase();
    return (k.customer_name || '').toLowerCase().includes(q) || (k.phone || '').includes(q);
  });

  const parsedTendered = parseFloat(tenderedAmount) || total;
  const calculatedChange = Math.max(0, parsedTendered - total);

  const handleProcessCheckout = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    try {
      let finalName = customerName;
      let finalPhone = customerPhone;

      if (selectedKhataCustomer) {
        finalName = selectedKhataCustomer.customer_name;
        finalPhone = selectedKhataCustomer.phone;
      } else if (showNewCustInput && newCustomerName.trim()) {
        finalName = newCustomerName.trim();
        finalPhone = newCustomerPhone.trim();
      }

      const checkoutPayload = {
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        items: items.map((i) => ({
          product_id: i.id, product_name: i.name, quantity: i.quantity,
          unit_price: i.price, discount: i.discount, line_total: i.price * i.quantity * (1 - i.discount / 100)
        })),
        total_amount: total, discount: 0, tax: 0,
        payment_mode: paymentMode,
        cashier_name: cashierName || 'Tariq Cashier',
        customer_phone: finalPhone || '03000000000',
        cash_paid: parsedTendered, cash_change: calculatedChange,
      };

      const res = await posCheckout(checkoutPayload);
      setReceiptData({
        invoice_number: res.invoice_number || checkoutPayload.invoice_number,
        items: checkoutPayload.items,
        subtotal: total, discount_total: 0, tax_total: 0, grand_total: total,
        cash_paid: parsedTendered, cash_change: calculatedChange,
        payment_mode: paymentMode, customer_name: finalName, customer_phone: finalPhone,
        cashier_name: checkoutPayload.cashier_name,
      });
    } catch (err: any) {
      alert(`Checkout Notice: ${err.message || 'Error processing transaction'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">POS Payment Checkout</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center font-mono">
            <span className="text-xs font-bold text-emerald-900">Total Payable Amount</span>
            <span className="text-xl font-bold text-emerald-700">{formatCurrency(total)}</span>
          </div>

          <PaymentModeButtons paymentMode={paymentMode} setPaymentMode={setPaymentMode} />

          {paymentMode === 'KHATA' && (
            <PaymentCustomerSelect
              customerSearch={customerSearch} setCustomerSearch={setCustomerSearch}
              filteredKhatas={filteredKhatas} selectedKhataCustomer={selectedKhataCustomer}
              setSelectedKhataCustomer={setSelectedKhataCustomer} showNewCustInput={showNewCustInput}
              setShowNewCustInput={setShowNewCustInput} newCustomerName={newCustomerName}
              setNewCustomerName={setNewCustomerName} newCustomerPhone={newCustomerPhone}
              setNewCustomerPhone={setNewCustomerPhone}
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <label className="block text-slate-600 font-bold mb-1 font-sans">Tendered Amount</label>
              <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900" value={parsedTendered} onChange={(e) => setTenderedAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-1 font-sans">Change Due</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-emerald-700">{formatCurrency(calculatedChange)}</div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer">Cancel</button>
          <button onClick={handleProcessCheckout} disabled={isSubmitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <span>{isSubmitting ? 'Processing...' : 'Complete Payment'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {receiptData && (
        <ThermalReceiptModal receiptData={receiptData} onClose={() => { setReceiptData(null); clearCart(); onClose(); }} />
      )}
    </div>
  );
}
