'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Search, Check, RefreshCw, AlertTriangle, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';
import { fetchBillingHistory } from '@/lib/api';

interface CustomerReturnModalProps {
  onClose: () => void;
  onSuccess: (newReturn: any) => void;
}

export default function CustomerReturnModal({ onClose, onSuccess }: CustomerReturnModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Bill Search & Load
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Return Details
  const [returnItems, setReturnItems] = useState<{ name: string; qty: number; maxQty: number; price: number }[]>([]);
  const [itemCondition, setItemCondition] = useState<'RESTOCKABLE' | 'DAMAGED'>('RESTOCKABLE');
  const [settlementType, setSettlementType] = useState<'CASH' | 'STORE_CREDIT' | 'EXCHANGE'>('CASH');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await fetchBillingHistory();
      if (Array.isArray(data)) setRecentInvoices(data);
    } catch (err) {
      console.error('Error fetching billing history for returns:', err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const parseItems = (jsonStr: any) => {
    if (!jsonStr) return [];
    if (Array.isArray(jsonStr)) return jsonStr;
    try { return JSON.parse(jsonStr); } catch { return []; }
  };

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    const parsed = parseItems(inv.item_details_json);
    const mapped = parsed.map((item: any) => ({
      name: item.name || item.product_name || 'Fabric Item',
      qty: 1,
      maxQty: item.quantity || 1,
      price: item.price || 0,
    }));
    setReturnItems(mapped.length > 0 ? mapped : [{ name: 'Purchased Fabric', qty: 1, maxQty: 5, price: 1500 }]);
  };

  const totalReturnValue = returnItems.reduce((s, i) => s + (i.qty * i.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalReturnValue <= 0) return;
    setIsSubmitting(true);

    try {
      const returnCode = `#CR-${Math.floor(1000 + Math.random() * 9000)}`;
      const itemsSummary = returnItems
        .filter((i) => i.qty > 0)
        .map((i) => `${i.qty}x ${i.name}`)
        .join(', ');

      const newReturn = {
        id: `cr-${Date.now()}`,
        return_code: returnCode,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        customer_name: selectedInvoice?.customer_phone || selectedInvoice?.customer_name || 'Walk-in Customer',
        customer_phone: selectedInvoice?.customer_phone || '0300-0000000',
        original_invoice: selectedInvoice?.invoice_number || invoiceQuery || '#ORD-2026-117',
        returned_items: itemsSummary || 'Customer Returned Items',
        total_value: totalReturnValue,
        refund_type: settlementType === 'CASH' ? 'Cash Refund' : settlementType === 'STORE_CREDIT' ? 'Store Credit' : 'Exchange',
        condition: itemCondition === 'RESTOCKABLE' ? 'Restocked' : 'Damaged',
        status: 'Completed',
        reason: reason || 'Customer Return',
      };

      // If store credit, add to Customer Khata localStorage!
      if (settlementType === 'STORE_CREDIT' && typeof window !== 'undefined') {
        const khataStored = localStorage.getItem('pos_khata_records_v4');
        if (khataStored) {
          try {
            const records = JSON.parse(khataStored);
            const phone = newReturn.customer_phone;
            const updated = records.map((c: any) => {
              if (c.phone === phone || c.customer_name?.toLowerCase() === newReturn.customer_name.toLowerCase()) {
                const updatedBal = Math.max(0, (c.total_balance || 0) - totalReturnValue);
                return {
                  ...c,
                  total_balance: updatedBal,
                  ledger: [
                    {
                      id: `leg-cr-${Date.now()}`,
                      date: newReturn.date,
                      description: `Store Credit (${returnCode})`,
                      type: 'Payment',
                      debit: 0,
                      credit: totalReturnValue,
                      is_due: false,
                    },
                    ...(c.ledger || []),
                  ],
                };
              }
              return c;
            });
            localStorage.setItem('pos_khata_records_v4', JSON.stringify(updated));
          } catch {}
        }
      }

      playToastAudio('add');
      showCatalogToast(`Customer Return ${returnCode} processed successfully!`, 'add');
      onSuccess(newReturn);
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error processing return'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvoices = recentInvoices.filter((inv) => {
    if (!invoiceQuery.trim()) return true;
    const q = invoiceQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-xl flex flex-col overflow-hidden transition-all duration-300 ease-out max-h-[90vh] ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">New Customer Return / Exchange</h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">Sales Return & Inventory Adjustment</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-4 overflow-y-auto">
          {/* Step 1: Select Original Invoice */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              1. SEARCH & SELECT ORIGINAL INVOICE / BILL #
            </label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={invoiceQuery}
                onChange={(e) => setInvoiceQuery(e.target.value)}
                placeholder="Search by Invoice # (e.g., #ORD-2026-117 or phone)..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>

            {/* Quick Invoice Picker Pill Cards */}
            <div className="max-h-28 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white">
              {isLoadingInvoices ? (
                <div className="text-center py-3 text-slate-400 text-xs">Loading recent invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-3 text-slate-400 text-xs">No matching invoice found. Enter invoice manually above.</div>
              ) : (
                filteredInvoices.slice(0, 5).map((inv) => {
                  const isSel = selectedInvoice?.id === inv.id;
                  return (
                    <div
                      key={inv.id || inv.invoice_number}
                      onClick={() => handleSelectInvoice(inv)}
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                        isSel
                          ? 'bg-[#e6f4ea] border-emerald-400 font-semibold'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-mono text-slate-900">{inv.invoice_number}</span>
                      <span className="text-slate-500">{inv.customer_phone || 'Walk-in'}</span>
                      <span className="font-mono font-bold text-slate-900">Rs. {(inv.total_amount || 0).toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Return Items & Quantities */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              2. SELECT RETURNED ITEMS & QUANTITY
            </label>
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
              {returnItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-800 flex-1 truncate">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      max={item.maxQty}
                      value={item.qty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const copy = [...returnItems];
                        if (copy[idx]) {
                          copy[idx].qty = val;
                        }
                        setReturnItems(copy);
                      }}
                      className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-center font-mono font-bold"
                    />
                  </div>
                  <span className="font-mono font-bold text-slate-900 w-24 text-right">
                    Rs. {(item.qty * item.price).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Item Condition */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1.5">
              3. ITEM CONDITION (STOCK ACTION)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setItemCondition('RESTOCKABLE')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                  itemCondition === 'RESTOCKABLE'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Restockable (+1 Inventory)</span>
              </button>
              <button
                type="button"
                onClick={() => setItemCondition('DAMAGED')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${
                  itemCondition === 'DAMAGED'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Damaged / Defect Claim Box</span>
              </button>
            </div>
          </div>

          {/* Step 4: Settlement Type */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1.5">
              4. SETTLEMENT METHOD
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSettlementType('CASH')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settlementType === 'CASH'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash Refund</span>
              </button>
              <button
                type="button"
                onClick={() => setSettlementType('STORE_CREDIT')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settlementType === 'STORE_CREDIT'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Store Credit</span>
              </button>
              <button
                type="button"
                onClick={() => setSettlementType('EXCHANGE')}
                className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settlementType === 'EXCHANGE'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Exchange</span>
              </button>
            </div>
          </div>

          {/* Reason Note */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              REASON FOR RETURN (OPTIONAL)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Size/Color mismatch, customer changed mind..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Return Total Banner */}
          <div className="bg-[#f0f5ff] border border-blue-200 rounded-xl p-3 flex justify-between items-center text-xs font-mono font-bold text-slate-900">
            <span>TOTAL RETURN REFUND VALUE:</span>
            <span className="text-base text-rose-600">Rs. {totalReturnValue.toLocaleString()}</span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalReturnValue <= 0}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Processing...' : 'Complete Customer Return'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
