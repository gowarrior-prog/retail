'use client';
import { useState } from 'react';
import { CreditCard, Wallet, BookOpen, Printer } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';

export default function PaymentKeypad() {
  const {
    items,
    tenderedAmount,
    setTenderedAmount,
    grandTotal,
    changeDue,
    paymentMode,
    setPaymentMode,
    customerName,
    customerPhone,
    clearCart,
  } = useCartStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  const handleNumpad = (val: string) => {
    if (val === 'C') {
      setTenderedAmount('');
    } else {
      setTenderedAmount(tenderedAmount + val);
    }
  };

  const handleCompletePay = async () => {
    if (items.length === 0) {
      alert('Cart is empty! Add products before checkout.');
      return;
    }

    if (paymentMode === 'CASH') {
      const tendered = parseFloat(tenderedAmount) || 0;
      if (tendered < grandTotal()) {
        alert(`Tendered cash (${formatCurrency(tendered)}) is less than Grand Total (${formatCurrency(grandTotal())}).`);
        return;
      }
    }

    if (paymentMode === 'CREDIT_KHATA' && !customerPhone) {
      alert('Please enter Client Phone number for Credit Khata entry.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        store_id: 'store-1',
        cashier_name: 'Tariq Ahmed',
        customer_phone: customerPhone || null,
        customer_name: customerName || 'Walk-in Client',
        payment_mode: paymentMode,
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

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
      {/* Payment Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs font-bold">
        <button
          onClick={() => setPaymentMode('CASH')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === 'CASH'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-white'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Cash</span>
        </button>

        <button
          onClick={() => setPaymentMode('BANK')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === 'BANK'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-indigo-600 hover:bg-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Card / Bank</span>
        </button>

        <button
          onClick={() => setPaymentMode('CREDIT_KHATA')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            paymentMode === 'CREDIT_KHATA'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-amber-600 hover:bg-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Khata</span>
        </button>
      </div>

      {/* Touch Numpad */}
      {paymentMode === 'CASH' && (
        <div className="grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className={`h-10 rounded-xl font-mono text-sm font-bold border transition-all active:scale-95 cursor-pointer ${
                key === 'C'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-slate-50/80 hover:bg-indigo-50 hover:text-indigo-600 text-slate-800 border-slate-200/80'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Complete Checkout Button */}
      <button
        onClick={handleCompletePay}
        disabled={isProcessing || items.length === 0}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-between px-4 active:scale-[0.99] disabled:opacity-50 shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-2 font-sans">
          <Printer className="w-4 h-4" />
          <span>{isProcessing ? 'Processing Transaction...' : 'Complete & Print Receipt'}</span>
        </div>
        <span className="font-mono text-sm font-black">{formatCurrency(grandTotal())}</span>
      </button>

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
            payment_mode: paymentMode,
            customer_name: customerName,
            customer_phone: customerPhone,
          }}
          onClose={handleFinishTransaction}
        />
      )}
    </div>
  );
}
