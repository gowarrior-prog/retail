'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle2, RotateCcw } from 'lucide-react';
import { posSalesReturn } from '@/lib/api';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';
import { showCatalogToast } from '@/lib/toast';

export default function SalesReturnModal({ onClose }: { onClose: () => void }) {
  const { items: cartItems } = useCartStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [returnReason, setReturnReason] = useState('Defective Fabric');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: boolean }>({});

  const itemsToDisplay = cartItems.length > 0 ? cartItems : [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const totalRefund = itemsToDisplay.reduce((sum, item) => (selectedItems[item.id] ? sum + (item.price * item.quantity) : sum), 0);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const toggleItemSelect = (id: string) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProcessReturn = async () => {
    setIsSubmitting(true);
    try {
      const activeItems = itemsToDisplay.filter((i) => selectedItems[i.id]);
      const res = await posSalesReturn({
        original_invoice_number: invoiceSearch || `INV-${Date.now().toString().slice(-6)}`,
        items: activeItems.map((i) => ({ product_id: i.id, product_name: i.name, quantity: i.quantity, refund_price: i.price })),
        refund_amount: totalRefund,
        reason: returnReason,
      });
      setSuccessResult(res);
      showCatalogToast('Sales return processed successfully!', 'delete');
    } catch (err: any) {
      alert(`Return Notice: ${err.message || 'Error processing sales return'}`);
    } finally {
      setIsSubmitting(false);
    }
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
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Process Return & Refund</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">Terminal Verification</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 bg-slate-50 flex flex-col gap-3.5">
          {successResult ? (
            <div className="py-8 flex flex-col items-center text-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-[#1b3830]" />
              <h4 className="text-base font-bold text-slate-900">Sales Return Processed!</h4>
              <p className="text-xs text-slate-600 font-mono">Invoice #: {invoiceSearch || successResult.return_invoice}</p>
              <p className="text-lg font-bold text-rose-700 font-mono">Refunded: {formatCurrency(totalRefund)}</p>
              <button onClick={handleAnimatedClose} className="mt-2 px-6 py-2 bg-[#1b3830] text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-[#142e27] transition">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Original Bill / Invoice search */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono mb-1 block">
                  ORIGINAL BILL / INVOICE #
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                      placeholder="Enter Invoice #"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
                    />
                  </div>
                  <button className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white font-bold text-xs rounded-xl transition cursor-pointer">
                    Verify
                  </button>
                </div>
              </div>

              {/* Return Reason Pills */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono mb-1 block">
                  RETURN REASON
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Defective Fabric', 'Wrong Cut', 'Customer Exchange'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setReturnReason(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        returnReason === r
                          ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 tracking-wider uppercase font-mono mb-1">
                  <span>SELECT ITEMS TO RETURN</span>
                  <span className="text-slate-500 font-sans font-semibold">Checked items are refunded</span>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl p-2.5 space-y-2 max-h-[160px] overflow-y-auto">
                  {itemsToDisplay.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs italic font-medium">
                      Enter invoice number above to load items for return
                    </div>
                  ) : (
                    itemsToDisplay.map((item) => {
                      const isChecked = Boolean(selectedItems[item.id]);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelect(item.id)}
                          className={`rounded-lg p-2.5 border flex items-center justify-between cursor-pointer transition ${
                            isChecked
                              ? 'bg-emerald-50 border-emerald-400 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-slate-300 text-[#1b3830] focus:ring-[#1b3830] cursor-pointer"
                            />
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.sku || 'FABRIC'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold font-mono text-slate-900">
                            Rs. {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Total Refund Banner */}
              <div className="bg-[#1b3830] rounded-xl p-3.5 border border-emerald-900 flex items-center justify-between text-white shadow-xs">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block leading-tight">
                    TOTAL REFUND AMOUNT
                  </span>
                  <span className="text-[10px] text-emerald-200 font-medium block">
                    Refunded via Cash
                  </span>
                </div>
                <span className="text-xl font-bold font-mono text-rose-400">
                  Rs. {totalRefund.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        {!successResult && (
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              onClick={handleAnimatedClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleProcessReturn}
              disabled={isSubmitting || totalRefund === 0}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center shadow-xs transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Processing...' : 'Confirm Return & Refund'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
