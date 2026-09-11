'use client';
import { useState } from 'react';
import { CreditCard, Wallet, BookOpen, Printer, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { posCheckout } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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

  const handleQuickCash = (val: number) => {
    setTenderedAmount(val.toString());
  };

  const handleExactCash = () => {
    setTenderedAmount(grandTotal().toString());
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
        cashier_name: 'Tariq',
        customer_phone: customerPhone || null,
        customer_name: customerName || 'Walk-in Client',
        payment_mode: paymentMode,
        amount_tendered: parseFloat(tenderedAmount) || grandTotal(),
        items: items.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          discount_percentage: item.discount,
        })),
      };

      const result = await posCheckout(payload);
      setCheckoutSuccess(result);
      setIsProcessing(false);

      // Print thermal receipt simulation
      setTimeout(() => {
        window.print();
      }, 500);
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
    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-3">
      {/* Payment Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
        <button
          onClick={() => setPaymentMode('CASH')}
          className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            paymentMode === 'CASH'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Cash</span>
        </button>

        <button
          onClick={() => setPaymentMode('BANK')}
          className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            paymentMode === 'BANK'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Card / Bank</span>
        </button>

        <button
          onClick={() => setPaymentMode('CREDIT_KHATA')}
          className={`py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${
            paymentMode === 'CREDIT_KHATA'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Khata</span>
        </button>
      </div>

      {/* Tendered & Change Due Row */}
      {paymentMode === 'CASH' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex flex-col">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Cash Tendered
            </span>
            <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
              {tenderedAmount ? formatCurrency(parseFloat(tenderedAmount) || 0) : 'Rs. 0'}
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 flex flex-col">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Change Return
            </span>
            <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
              {formatCurrency(changeDue())}
            </div>
          </div>
        </div>
      )}

      {/* Quick Cash Buttons */}
      {paymentMode === 'CASH' && (
        <div className="grid grid-cols-4 gap-1.5">
          {[500, 1000, 5000].map((amt) => (
            <button
              key={amt}
              onClick={() => handleQuickCash(amt)}
              className="py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-xs font-mono font-bold text-slate-800 border border-slate-200 transition-colors"
            >
              Rs. {amt}
            </button>
          ))}
          <button
            onClick={handleExactCash}
            className="py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded text-xs font-mono font-bold transition-colors"
          >
            Exact
          </button>
        </div>
      )}

      {/* Touch Numpad */}
      {paymentMode === 'CASH' && (
        <div className="grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '.'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              className={`h-9 rounded font-mono text-sm font-semibold border transition-all active:scale-95 ${
                key === 'C'
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300 font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
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
        className="w-full h-11 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-between px-4 active:scale-[0.99] disabled:opacity-50"
      >
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4" />
          <span>{isProcessing ? 'Processing Transaction...' : 'Complete & Print Receipt'}</span>
        </div>
        <span className="font-mono text-sm font-bold">{formatCurrency(grandTotal())}</span>
      </button>

      {/* Transaction Success Dialog */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 shadow-xl border border-slate-200 max-w-sm w-full text-center flex flex-col gap-3">
            <CheckCircle className="w-12 h-12 text-slate-900 mx-auto" />
            <h3 className="font-bold text-slate-900 text-lg">Transaction Completed!</h3>
            <p className="text-xs text-slate-600 font-mono">
              Invoice #{checkoutSuccess.invoice_number}
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono flex flex-col gap-1 text-slate-700">
              <div className="flex justify-between">
                <span>Grand Total:</span>
                <span className="font-bold">{formatCurrency(checkoutSuccess.grand_total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change Returned:</span>
                <span className="font-bold">{formatCurrency(checkoutSuccess.change_returned || 0)}</span>
              </div>
            </div>
            <button
              onClick={handleFinishTransaction}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors mt-2"
            >
              New Sale (Clear Terminal)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
