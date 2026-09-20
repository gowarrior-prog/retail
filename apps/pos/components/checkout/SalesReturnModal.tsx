'use client';

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Search, CheckCircle2, Printer, AlertTriangle, ArrowLeft } from 'lucide-react';
import { fetchBillingHistory, posSalesReturn, Product } from '@/lib/api';
import { useProductStore } from '@/stores/useProductStore';
import { formatCurrency } from '@/lib/utils';

interface SalesReturnModalProps {
  onClose: () => void;
}

export default function SalesReturnModal({ onClose }: SalesReturnModalProps) {
  const { loadProducts } = useProductStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<{ [itemId: string]: number }>({});
  const [returnReason, setReturnReason] = useState('Customer Changed Mind');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnResult, setReturnResult] = useState<any | null>(null);

  useEffect(() => {
    fetchBillingHistory().then((data) => {
      setInvoices(data || []);
    }).catch(() => null);
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.customer_phone && inv.customer_phone.toLowerCase().includes(q))
    );
  });

  const parsedItems = React.useMemo(() => {
    if (!selectedInvoice?.item_details_json) return [];
    try {
      return JSON.parse(selectedInvoice.item_details_json);
    } catch {
      return [];
    }
  }, [selectedInvoice]);

  const handleSelectInvoice = (inv: any) => {
    setSelectedInvoice(inv);
    setReturnItems({});
  };

  const handleQtyChange = (itemId: string, maxQty: number, change: number) => {
    const current = returnItems[itemId] || 0;
    const updated = Math.max(0, Math.min(maxQty, current + change));
    setReturnItems((prev) => ({
      ...prev,
      [itemId]: updated,
    }));
  };

  // Calculate refund total
  const refundTotal = parsedItems.reduce((sum: number, item: any, idx: number) => {
    const key = item.product_id || `${item.product_name}-${idx}`;
    const qty = returnItems[key] || 0;
    const price = item.price || item.unit_price || 0;
    return sum + (price * qty);
  }, 0);

  const totalReturnCount = Object.values(returnItems).reduce((sum, q) => sum + q, 0);

  const handleProcessReturn = async () => {
    if (totalReturnCount === 0) {
      alert('Please select at least 1 item to return!');
      return;
    }

    setIsSubmitting(true);

    const payloadItems = parsedItems
      .filter((item: any, idx: number) => {
        const key = item.product_id || `${item.product_name}-${idx}`;
        return (returnItems[key] || 0) > 0;
      })
      .map((item: any, idx: number) => {
        const key = item.product_id || `${item.product_name}-${idx}`;
        return {
          product_id: item.product_id || `prod-${idx}`,
          product_name: item.product_name || item.name || 'Fabric Item',
          quantity: returnItems[key] || 0,
          refund_price: item.price || item.unit_price || 0,
        };
      });

    try {
      const res = await posSalesReturn({
        original_invoice_number: selectedInvoice.invoice_number,
        items: payloadItems,
        refund_amount: refundTotal,
        reason: returnReason,
        cashier_name: 'Admin',
      });

      // Reload product catalog to reflect restored stock immediately
      loadProducts(true);

      setReturnResult({
        ...res,
        original_invoice_number: selectedInvoice.invoice_number,
        returned_items: payloadItems,
        refund_amount: refundTotal,
        return_date: new Date().toLocaleString(),
      });
    } catch (err: any) {
      alert(`Return failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReturnReceipt = () => {
    if (!returnResult) return;
    const itemsHtml = returnResult.returned_items
      .map(
        (i: any) => `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
          <span>${i.product_name} x${i.quantity} (RETURN)</span>
          <span style="font-weight: 700;">-Rs. ${(i.refund_price * i.quantity).toLocaleString()}</span>
        </div>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Courier New', monospace; width: 76mm; margin: 0 auto; padding: 10px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">BILAL CLOTH & SILK CENTER</div>
          <div class="center" style="font-size: 11px;">NAROWAL • Tel: 0301-0606643</div>
          <div class="divider"></div>
          <div class="center bold" style="font-size: 13px; color: #b91c1c;">*** SALES RETURN / REFUND SLIP ***</div>
          <div style="font-size: 11px; margin-top: 4px;">
            <div>Return Slip: ${returnResult.return_invoice || 'RET-001'}</div>
            <div>Orig. Invoice: ${returnResult.original_invoice_number}</div>
            <div>Date: ${returnResult.return_date}</div>
            <div>Reason: ${returnReason}</div>
          </div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 900;">
            <span>CASH REFUNDED:</span>
            <span>Rs. ${returnResult.refund_amount.toLocaleString()}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 10px; margin-top: 8px;">
            Stock has been restored to inventory.<br />
            Thank you!
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Product Return & Bill Refund (Wapsi)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Return products from past bills, refund cash & restock inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {returnResult ? (
            /* Return Success View */
            <div className="py-6 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Sales Return Processed Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Product stock has been automatically restored into inventory.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full max-w-md my-2 text-left font-mono text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Return Slip #:</span>
                  <span className="font-bold text-slate-900">{returnResult.return_invoice}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Original Invoice:</span>
                  <span className="font-bold text-slate-900">{returnResult.original_invoice_number}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm font-bold text-rose-700">
                  <span>Cash Refund Due:</span>
                  <span>Rs. {returnResult.refund_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintReturnReceipt}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Refund Slip</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !selectedInvoice ? (
            /* Step 1: Search & Pick Invoice */
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search invoice number (e.g. INV-...) or customer phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <span className="text-[11px] font-bold text-slate-500">Recent Completed Invoices:</span>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No invoices found matching search.</div>
                ) : (
                  filteredInvoices.slice(0, 15).map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs font-mono">{inv.invoice_number}</div>
                        <div className="text-[10.5px] text-slate-500">
                          {inv.customer_phone || 'Walk-in'} • {inv.payment_mode} • {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'Recent'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-800 font-mono text-xs">
                          {formatCurrency(inv.total_amount)}
                        </div>
                        <span className="text-[10px] text-indigo-600 font-bold">Select & Return →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Choose Items to Return */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Search
                </button>
                <span className="font-mono font-bold text-slate-900">
                  Invoice: {selectedInvoice.invoice_number}
                </span>
              </div>

              <div className="text-xs font-bold text-slate-700">Select Item(s) Being Returned:</div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                {parsedItems.map((item: any, idx: number) => {
                  const key = item.product_id || `${item.product_name}-${idx}`;
                  const currentReturn = returnItems[key] || 0;
                  const price = item.price || item.unit_price || 0;
                  return (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <div className="flex-1 pr-3">
                        <div className="font-bold text-slate-900 text-xs">{item.product_name || item.name}</div>
                        <div className="text-[10.5px] text-slate-500 font-mono">
                          Purchased: {item.quantity} units @ Rs. {price.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, item.quantity, -1)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-slate-700 hover:bg-white rounded"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-mono font-bold text-xs">
                            {currentReturn}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQtyChange(key, item.quantity, 1)}
                            className="w-6 h-6 flex items-center justify-center font-bold text-slate-700 hover:bg-white rounded"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-bold text-xs min-w-[70px] text-right text-rose-700">
                          {currentReturn > 0 ? `-Rs. ${(price * currentReturn).toLocaleString()}` : 'Rs. 0'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reason Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Reason for Return:</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none"
                >
                  <option value="Customer Changed Mind">Customer Changed Mind</option>
                  <option value="Fabric Defect / Damage">Fabric Defect / Damage</option>
                  <option value="Wrong Color / Shade">Wrong Color / Shade</option>
                  <option value="Size / Measurement Issue">Size / Measurement Issue</option>
                  <option value="Exchange for Another Fabric">Exchange for Another Fabric</option>
                </select>
              </div>

              {/* Refund Summary Card */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900">
                <div>
                  <span className="text-xs font-bold block">TOTAL REFUND AMOUNT (RETURN):</span>
                  <span className="text-[10px] text-rose-600 font-medium">{totalReturnCount} unit(s) selected to restock</span>
                </div>
                <div className="font-mono font-black text-xl text-rose-800">
                  Rs. {refundTotal.toLocaleString()}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleProcessReturn}
                disabled={isSubmitting || totalReturnCount === 0}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmitting ? 'Processing Return...' : `Confirm Return & Refund Rs. ${refundTotal.toLocaleString()}`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
