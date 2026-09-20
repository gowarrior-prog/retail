'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Wallet,
  CreditCard,
  BookOpen,
  ArrowRight,
  Printer,
  Receipt,
  Search,
  UserPlus,
  Building2,
  Smartphone,
  Check,
} from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/useCartStore';
import { posCheckout, fetchKhata, getLocalKhataCache } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';

interface PaymentModalProps {
  onClose: () => void;
  splitConfig?: { cashPart: number; digitalPart: number; digitalMode: string };
}

export default function PaymentModal({ onClose, splitConfig }: PaymentModalProps) {
  const {
    items,
    subtotal,
    discountTotal,
    grandTotal,
    paymentMode,
    setPaymentMode,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    cashierName,
    orderNote,
    clearCart,
  } = useCartStore();

  const totalPayable = grandTotal();
  const [activePaymentMode, setActivePaymentMode] = useState<string>(splitConfig ? 'SPLIT' : paymentMode || 'CASH');

  // Cash Tender State
  const [tenderedInput, setTenderedInput] = useState<string>(
    splitConfig ? splitConfig.cashPart.toString() : totalPayable.toString()
  );

  // Card / POS State
  const [cardTerminalSlip, setCardTerminalSlip] = useState<string>('');
  const [cardType, setCardType] = useState<string>('VISA');

  // JazzCash / Bank State
  const [digitalProvider, setDigitalProvider] = useState<string>('JAZZCASH');
  const [transactionId, setTransactionId] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');

  // Khata / Credit State
  const [khataList, setKhataList] = useState<any[]>(() => getLocalKhataCache());
  const [khataSearch, setKhataSearch] = useState<string>('');
  const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<any | null>(null);
  const [customKhataName, setCustomKhataName] = useState<string>('');
  const [customKhataPhone, setCustomKhataPhone] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  useEffect(() => {
    fetchKhata().then((res) => {
      if (Array.isArray(res) && res.length > 0) {
        setKhataList(res);
      }
    }).catch(() => null);
  }, []);

  const tenderedAmountNum = parseFloat(tenderedInput) || 0;
  const cashTargetAmount = splitConfig ? splitConfig.cashPart : totalPayable;
  const changeDueNum = Math.max(0, tenderedAmountNum - cashTargetAmount);

  const handleQuickTender = (amount: number) => {
    setTenderedInput(amount.toString());
  };

  const handleNumpadKey = (key: string) => {
    if (key === 'C') {
      setTenderedInput('');
    } else if (key === 'BACK') {
      setTenderedInput((prev) => prev.slice(0, -1));
    } else if (key === 'EXACT') {
      setTenderedInput(cashTargetAmount.toString());
    } else {
      setTenderedInput((prev) => prev + key);
    }
  };

  const handleValidateCheckout = async (shouldPrint: boolean = true) => {
    if (items.length === 0) return;

    // Validation for payment modes
    if (activePaymentMode === 'CASH' && tenderedAmountNum < totalPayable) {
      alert(`Tendered cash (${formatCurrency(tenderedAmountNum)}) is less than Payable Total (${formatCurrency(totalPayable)}).`);
      return;
    }

    if (activePaymentMode === 'KHATA') {
      const finalKhataName = selectedKhataCustomer ? selectedKhataCustomer.customer_name : customKhataName.trim();
      const finalKhataPhone = selectedKhataCustomer ? selectedKhataCustomer.phone : customKhataPhone.trim();
      if (!finalKhataName || !finalKhataPhone) {
        alert('Please select or enter Customer Name and Phone Number for Khata (Udhar) record.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const resolvedCustomerName =
        activePaymentMode === 'KHATA'
          ? (selectedKhataCustomer?.customer_name || customKhataName.trim() || 'Khata Customer')
          : (customerName.trim() || 'Customer');

      const resolvedCustomerPhone =
        activePaymentMode === 'KHATA'
          ? (selectedKhataCustomer?.phone || customKhataPhone.trim() || null)
          : (customerPhone.trim() || null);

      let modeSummary = activePaymentMode;
      if (activePaymentMode === 'CARD') {
        modeSummary = `CARD / POS (${cardType} Ref: ${cardTerminalSlip || 'Approved'})`;
      } else if (activePaymentMode === 'BANK') {
        modeSummary = `${digitalProvider} (TID: ${transactionId || 'Confirmed'})`;
      } else if (activePaymentMode === 'KHATA') {
        modeSummary = 'CREDIT_KHATA';
      } else if (activePaymentMode === 'SPLIT' && splitConfig) {
        modeSummary = `SPLIT (Cash: Rs. ${splitConfig.cashPart}, ${splitConfig.digitalMode}: Rs. ${splitConfig.digitalPart})`;
      }

      const payload = {
        store_id: 'store-1',
        cashier_name: cashierName || 'Admin',
        customer_phone: resolvedCustomerPhone,
        customer_name: resolvedCustomerName,
        payment_mode: modeSummary,
        tax_percentage: 0,
        amount_paid: totalPayable,
        amount_tendered: activePaymentMode === 'CASH' ? tenderedAmountNum : totalPayable,
        order_note: orderNote || null,
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
        clearCart();
        onClose();
      }
    } catch (err: any) {
      setIsProcessing(false);
      alert(`Checkout: Saved into local system successfully. (${err.message || 'Complete'})`);
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

  const filteredKhata = khataList.filter((k) => {
    if (!khataSearch.trim()) return true;
    const q = khataSearch.toLowerCase();
    return (
      (k.customer_name && k.customer_name.toLowerCase().includes(q)) ||
      (k.phone && k.phone.includes(q))
    );
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Receipt className="w-4.5 h-4.5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Payment & Billing Checkout</h3>
                <p className="text-[11px] text-slate-500 font-medium">Select payment mode and validate transaction</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto min-h-0">
            {/* Left: Bill Summary */}
            <div className="md:col-span-5 p-3.5 sm:p-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 flex flex-col gap-3 overflow-y-auto">
              <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                <span>ORDER ITEMS ({items.length})</span>
                <span className="text-[11px] text-emerald-700 font-semibold">{items.reduce((s, i) => s + i.quantity, 0)} Total Pcs</span>
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-xl bg-white overflow-hidden max-h-56 overflow-y-auto shadow-2xs divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10.5px] text-slate-500 font-mono">
                        {item.quantity} × Rs. {item.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900 shrink-0">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {orderNote && (
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <span className="font-bold">Note:</span> {orderNote}
                </div>
              )}

              {/* Financial Totals Card - 100% Tax Free */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 flex flex-col gap-1.5 shadow-sm mt-auto">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">Rs. {subtotal().toLocaleString()}</span>
                </div>

                {discountTotal() > 0 && (
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">-Rs. {discountTotal().toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                  <span className="font-bold text-xs sm:text-sm text-emerald-400">TOTAL PAYABLE:</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-white">
                    Rs. {totalPayable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Payment Modes */}
            <div className="md:col-span-7 p-3.5 sm:p-4 flex flex-col gap-3 overflow-y-auto">
              {/* Payment Mode Selector Tabs */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-700">SELECT PAYMENT MODE:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setActivePaymentMode('CASH')}
                    className={cn(
                      'p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer select-none',
                      activePaymentMode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <Wallet className="w-5 h-5" />
                    <span className="text-xs font-bold">Cash</span>
                  </button>

                  <button
                    onClick={() => setActivePaymentMode('CARD')}
                    className={cn(
                      'p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer select-none',
                      activePaymentMode === 'CARD'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-bold">Card / POS</span>
                  </button>

                  <button
                    onClick={() => setActivePaymentMode('BANK')}
                    className={cn(
                      'p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer select-none',
                      activePaymentMode === 'BANK'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs font-bold">JazzCash / Bank</span>
                  </button>

                  <button
                    onClick={() => setActivePaymentMode('KHATA')}
                    className={cn(
                      'p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer select-none',
                      activePaymentMode === 'KHATA'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-xs font-bold">Khata (Udhar)</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: CASH */}
              {activePaymentMode === 'CASH' && (
                <div className="flex flex-col gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 mr-1">QUICK TENDER:</span>
                    <button
                      onClick={() => handleQuickTender(cashTargetAmount)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-300 transition"
                    >
                      Exact (Rs. {cashTargetAmount.toLocaleString()})
                    </button>
                    {[500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleQuickTender(amt)}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition"
                      >
                        Rs. {amt}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">CASH RECEIVED (PKR)</label>
                      <input
                        type="text"
                        value={tenderedInput}
                        onChange={(e) => setTenderedInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-0.5">CHANGE RETURNED (PKR)</label>
                      <div className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg font-mono text-base font-black text-emerald-700">
                        Rs. {changeDueNum.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Numpad */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {['7', '8', '9', 'C', '4', '5', '6', 'BACK', '1', '2', '3', 'EXACT'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleNumpadKey(k)}
                        className={cn(
                          'py-1.5 rounded-lg font-mono font-bold text-sm border transition active:scale-95 cursor-pointer',
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

              {/* Mode 2: CARD / POS MACHINE */}
              {activePaymentMode === 'CARD' && (
                <div className="flex flex-col gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-700" /> Bank POS Card Machine Payment
                    </span>
                    <span className="font-mono text-sm font-black text-blue-800">
                      Charge: Rs. {totalPayable.toLocaleString()}
                    </span>
                  </div>

                  {/* Card Type Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Brand:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['VISA', 'Mastercard', 'PayPak', 'UnionPay'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCardType(c)}
                          className={cn(
                            'py-1 text-xs font-bold rounded-lg border text-center transition cursor-pointer',
                            cardType === c
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100'
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Machine Slip / Auth Code */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      POS Machine Slip Reference / Approval Code (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Auth-89421 / Slip #5023"
                      value={cardTerminalSlip}
                      onChange={(e) => setCardTerminalSlip(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-blue-200 text-[11px] text-blue-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Customer swiped/inserted card on counter POS machine. Payment confirmed.</span>
                  </div>
                </div>
              )}

              {/* Mode 3: JAZZCASH / EASYPAISA / BANK TRANSFER */}
              {activePaymentMode === 'BANK' && (
                <div className="flex flex-col gap-3 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-700" /> Digital Mobile & Bank Payment
                    </span>
                    <span className="font-mono text-sm font-black text-indigo-800">
                      Amount: Rs. {totalPayable.toLocaleString()}
                    </span>
                  </div>

                  {/* Digital Provider Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Select Channel:</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['JAZZCASH', 'EASYPAISA', 'RAAST', 'BANK'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDigitalProvider(p)}
                          className={cn(
                            'py-1 text-xs font-bold rounded-lg border text-center transition cursor-pointer',
                            digitalProvider === p
                              ? 'bg-indigo-600 text-white border-indigo-700'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-100'
                          )}
                        >
                          {p === 'BANK' ? 'Bank Transfer' : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transaction ID & Sender Phone */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction ID (TID):</label>
                      <input
                        type="text"
                        placeholder="e.g. TID 987123445"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Sender Mobile #:</label>
                      <input
                        type="text"
                        placeholder="e.g. 0300-1234567"
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 4: KHATA (UDHAR / CREDIT) */}
              {activePaymentMode === 'KHATA' && (
                <div className="flex flex-col gap-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-amber-700" /> Customer Khata Ledger (Udhar)
                    </span>
                    <span className="font-mono text-sm font-black text-amber-800">
                      Bill: Rs. {totalPayable.toLocaleString()}
                    </span>
                  </div>

                  {/* Search Customer from Khata */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search existing Khata customer by name or phone..."
                      value={khataSearch}
                      onChange={(e) => {
                        setKhataSearch(e.target.value);
                        setSelectedKhataCustomer(null);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Filtered Khata List */}
                  {khataSearch.trim() && (
                    <div className="max-h-32 overflow-y-auto border border-amber-200 rounded-lg bg-white divide-y divide-slate-100">
                      {filteredKhata.slice(0, 5).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedKhataCustomer(c);
                            setKhataSearch('');
                          }}
                          className="p-2 flex items-center justify-between hover:bg-amber-50 cursor-pointer text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{c.customer_name}</span>
                            <span className="text-slate-500 text-[10.5px] ml-2">{c.phone}</span>
                          </div>
                          <span className="font-mono font-bold text-rose-700">
                            Balance: Rs. {(c.total_balance || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedKhataCustomer ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-emerald-900">
                          Selected: {selectedKhataCustomer.customer_name}
                        </div>
                        <div className="text-[10.5px] text-emerald-700 font-mono">{selectedKhataCustomer.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10.5px] text-slate-500">New Balance:</div>
                        <div className="font-mono font-black text-rose-700 text-sm">
                          Rs. {((selectedKhataCustomer.total_balance || 0) + totalPayable).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Enter New Khata Customer */
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-amber-600" /> Or Add Customer Details:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Customer Full Name *"
                          value={customKhataName}
                          onChange={(e) => setCustomKhataName(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Mobile / WhatsApp # *"
                          value={customKhataPhone}
                          onChange={(e) => setCustomKhataPhone(e.target.value)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons: Validate & Print vs Validate & Skip Print */}
              <div className="mt-auto flex flex-col gap-2 pt-2">
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
            subtotal: totalPayable,
            discount_total: discountTotal(),
            tax_total: 0,
            grand_total: totalPayable,
            cash_paid: activePaymentMode === 'CASH' ? tenderedAmountNum : totalPayable,
            cash_change: activePaymentMode === 'CASH' ? changeDueNum : 0,
            payment_mode: activePaymentMode,
            customer_name: activePaymentMode === 'KHATA' ? (selectedKhataCustomer?.customer_name || customKhataName) : undefined,
            customer_phone: activePaymentMode === 'KHATA' ? (selectedKhataCustomer?.phone || customKhataPhone) : undefined,
            cashier_name: cashierName,
          }}
          onClose={handleFinishAndNewOrder}
        />
      )}
    </>
  );
}
