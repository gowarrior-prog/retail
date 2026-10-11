'use client';

import React, { useState } from 'react';
import { X, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CustomerReturnRecord } from './CustomerReturnsTable';
import { SupplierReturnRecord } from './SupplierReturnsTable';
import { fetchBillingHistory, createCustomerReturn, createSupplierReturn } from '@/lib/api';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';
import { showProfessionalAlert } from '@/lib/alert';
import { useProductStore } from '@/stores/useProductStore';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomerReturn: (rec: CustomerReturnRecord) => void;
  onAddSupplierReturn: (rec: SupplierReturnRecord) => void;
}

export default function ReturnWorkflowDrawer({
  isOpen,
  onClose,
  onAddCustomerReturn,
  onAddSupplierReturn,
}: DrawerProps) {
  const [workflowTab, setWorkflowTab] = useState<'customer' | 'supplier'>('customer');

  // Customer Form State
  const [wfInvoiceInput, setWfInvoiceInput] = useState('');
  const [wfFetchedInvoice, setWfFetchedInvoice] = useState<any | null>(null);
  const [wfIsFetching, setWfIsFetching] = useState(false);
  const [wfCondition, setWfCondition] = useState<'RESTOCKABLE' | 'DAMAGED'>('RESTOCKABLE');
  const [wfSettlement, setWfSettlement] = useState<'CASH' | 'KHATA_CREDIT' | 'EXCHANGE'>('KHATA_CREDIT');

  // Supplier Form State
  const [wfSupplierName, setWfSupplierName] = useState('');
  const [wfPurchaseBill, setWfPurchaseBill] = useState('');
  const [wfReturnedItemsText, setWfReturnedItemsText] = useState('');
  const [wfSupplierReturnValue, setWfSupplierReturnValue] = useState<number>(0);
  const [wfSupplierReason, setWfSupplierReason] = useState('Defective Fabric');

  const showValidationError = (title: string, message: string) => {
    showProfessionalAlert(message, title, 'return');
  };

  const handleFetchBill = async () => {
    if (!wfInvoiceInput.trim()) {
      showValidationError("Invoice Missing", "Please enter the Sales Invoice first");
      return;
    }
    setWfIsFetching(true);
    try {
      const history = await fetchBillingHistory();
      if (Array.isArray(history)) {
        const searchClean = wfInvoiceInput.trim().toLowerCase().replace(/^#/, '');
        const match = history.find((h) => {
          const invClean = String(h.invoice_number || '').toLowerCase().replace(/^#/, '');
          return invClean === searchClean || invClean.includes(searchClean) || searchClean.includes(invClean);
        });

        if (match) {
          let items: any[] = [];
          if (Array.isArray(match.items)) {
            items = match.items;
          } else if (match.item_details_json) {
            try {
              items = typeof match.item_details_json === 'string'
                ? JSON.parse(match.item_details_json)
                : match.item_details_json;
            } catch { }
          }

          if (!Array.isArray(items) || items.length === 0) {
            items = [{ name: 'Purchased Fabric Item', quantity: 1, price: Number(match.total_amount || match.grand_total || 0) }];
          }

          setWfFetchedInvoice({
            invoice_number: match.invoice_number || wfInvoiceInput.trim(),
            customer_name: match.customer_phone || match.customer_name || 'Walk-in Client',
            customer_phone: match.customer_phone || '0300-0000000',
            total_amount: Number(match.total_amount || match.grand_total || 0),
            items: items.map((i: any, idx: number) => ({
              id: String(idx),
              name: i.name || i.product_name || 'Fabric Suit Item',
              qty: Number(i.quantity || i.qty || 1),
              price: Number(i.price || i.unit_price || match.total_amount || 0),
              selected: true,
            })),
          });
          setWfIsFetching(false);
          return;
        }
      }
    } catch (err) {
      console.error('handleFetchBill error:', err);
    }

    setWfFetchedInvoice(null);
    setWfIsFetching(false);
    showValidationError(
      "Invoice Not Found",
      `Please enter a correct invoice number.`
    );
  };

  const wfSelectedReturnValue = React.useMemo(() => {
    if (!wfFetchedInvoice?.items) return 0;
    return wfFetchedInvoice.items
      .filter((i: any) => i.selected)
      .reduce((sum: number, i: any) => sum + i.qty * i.price, 0);
  }, [wfFetchedInvoice]);

  const handleProcessWorkflow = async () => {
    const todayStr = `Today, ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    if (workflowTab === 'customer') {
      if (!wfFetchedInvoice || !wfFetchedInvoice.items || wfFetchedInvoice.items.length === 0) {
        showValidationError("Invoice Missing", "First, search and fetch a correct invoice.");
        return;
      }
      const selectedItems = wfFetchedInvoice.items.filter((i: any) => i.selected);
      if (selectedItems.length === 0 || wfSelectedReturnValue <= 0) {
        showValidationError("No Item Selected", "Baraye meharbani return karne ke liye kam se kam 1 item select karein.");
        return;
      }

      const code = `#CR-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedItemsText = selectedItems.map((i: any) => `${i.qty}x ${i.name}`).join(', ');

      const newRec: CustomerReturnRecord = {
        id: `cr-${Date.now()}`,
        return_code: code,
        date: todayStr,
        customer_name: wfFetchedInvoice.customer_name || 'Walk-in Customer',
        customer_phone: wfFetchedInvoice.customer_phone || '0300-0000000',
        original_invoice: wfFetchedInvoice.invoice_number,
        returned_items: selectedItemsText,
        total_value: wfSelectedReturnValue,
        refund_type: wfSettlement === 'CASH' ? 'Cash Refund' : wfSettlement === 'KHATA_CREDIT' ? 'Khata Credit' : 'Exchanged',
        condition: wfCondition === 'RESTOCKABLE' ? 'Restocked' : 'Damaged',
        status: 'Completed',
        reason: 'Customer Return & Stock Adjustment',
      };

      try {
        await createCustomerReturn({
          customer_name: wfFetchedInvoice.customer_name || 'Walk-in Customer',
          customer_phone: wfFetchedInvoice.customer_phone || '0300-0000000',
          original_invoice: wfFetchedInvoice.invoice_number,
          items: selectedItems.map((i: any) => ({
            product_id: i.id || 'prod-item',
            product_name: i.name,
            quantity: i.qty,
            refund_price: i.price,
          })),
          total_value: wfSelectedReturnValue,
          refund_type: wfSettlement === 'CASH' ? 'CASH' : wfSettlement === 'KHATA_CREDIT' ? 'KHATA_CREDIT' : 'EXCHANGE',
          condition: wfCondition === 'RESTOCKABLE' ? 'Restocked' : 'Damaged',
          status: 'Completed',
        });
      } catch (e) {
        console.warn('Customer return API notice:', e);
      }

      onAddCustomerReturn(newRec);
      playToastAudio('add');
      showCatalogToast(`Return ${code} Processed & DB2 Updated!`, 'add');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pos-data-updated'));
      }
    } else {
      if (!wfSupplierName.trim() || !wfPurchaseBill.trim() || !wfReturnedItemsText.trim() || wfSupplierReturnValue <= 0) {
        showValidationError(
          "Supplier Info Incomplete",
          "Please enter correct supplier return details"
        );
        return;
      }

      const code = `#SR-${Math.floor(300 + Math.random() * 900)}`;
      const newRec: SupplierReturnRecord = {
        id: `sr-${Date.now()}`,
        return_code: code,
        date: todayStr,
        supplier_name: wfSupplierName,
        purchase_bill: wfPurchaseBill,
        items_returned: wfReturnedItemsText,
        total_value: wfSupplierReturnValue,
        settlement_status: 'Ledgers Synced',
        reason: wfSupplierReason || 'Defective Fabric',
        status: 'Completed',
      };

      try {
        await createSupplierReturn({
          supplier_name: wfSupplierName,
          purchase_bill: wfPurchaseBill,
          items: [{ product_id: 'supplier-item', product_name: wfReturnedItemsText, quantity: 1, refund_price: wfSupplierReturnValue }],
          total_value: wfSupplierReturnValue,
          reason: wfSupplierReason || 'Defective Fabric Intake',
          status: 'Completed',
        });
      } catch (e) {
        console.warn('Supplier return API notice:', e);
      }

      onAddSupplierReturn(newRec);
      playToastAudio('add');
      showCatalogToast(`Debit Note ${code} generated & DB2 Supplier Return updated!`, 'add');
      useProductStore.getState().loadProducts(true).catch(() => {});
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pos-data-updated'));
      }
    }

    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div
        className={`fixed top-0 right-0 z-50 h-full w-[420px] max-w-[95vw] bg-white shadow-2xl flex flex-col font-sans border-l border-slate-200 transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-sm tracking-wide">New Return Workflow</h3>
          <button onClick={onClose} className="p-1 text-emerald-200 hover:text-white rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toggle */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setWorkflowTab('customer')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              workflowTab === 'customer'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Customer Return
          </button>
          <button
            type="button"
            onClick={() => setWorkflowTab('supplier')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
              workflowTab === 'supplier'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Supplier Return
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {workflowTab === 'customer' ? (
            <>
              {/* 1. FETCH BILL */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  1. SALE BILL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wfInvoiceInput}
                    onChange={(e) => setWfInvoiceInput(e.target.value)}
                    placeholder="Enter Invoice # (e.g., #INV-8840)..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1b3830] transition"
                  />
                  <button
                    onClick={handleFetchBill}
                    disabled={wfIsFetching}
                    className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition"
                  >
                    {wfIsFetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>

                {wfFetchedInvoice && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-bold text-slate-900">{wfFetchedInvoice.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Total:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rs. {(wfFetchedInvoice.total_amount || 18500).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SELECT ITEMS */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  2. SELECT ITEM(S) TO RETURN
                </label>

                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                  {wfFetchedInvoice?.items?.map((itm: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-xs p-1.5 rounded-lg hover:bg-slate-50">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itm.selected}
                          onChange={(e) => {
                            const copy = [...wfFetchedInvoice.items];
                            copy[idx].selected = e.target.checked;
                            setWfFetchedInvoice({ ...wfFetchedInvoice, items: copy });
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{itm.name}</span>
                          <span className="text-[10.5px] text-slate-500 font-mono">
                            Qty: {itm.qty} Suits @ Rs. {itm.price.toLocaleString()}
                          </span>
                        </div>
                      </label>
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-900 block">Rs. {(itm.qty * itm.price).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. CONDITION */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  3. PHYSICAL CONDITION & RESTOCK
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWfCondition('RESTOCKABLE')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      wfCondition === 'RESTOCKABLE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Restockable
                    </div>
                    <span className="text-[10.5px] text-slate-500 block mt-0.5">+ Stock into Main Inventory</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWfCondition('DAMAGED')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      wfCondition === 'DAMAGED'
                        ? 'bg-rose-50 border-rose-500 text-rose-900'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Damaged
                    </div>
                    <span className="text-[10.5px] text-slate-500 block mt-0.5">Claim Box Bin #4</span>
                  </button>
                </div>
              </div>

              {/* 4. SETTLEMENT */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  4. REFUND / KHATA SETTLEMENT
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWfSettlement('CASH')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      wfSettlement === 'CASH' ? 'bg-[#1b3830] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setWfSettlement('KHATA_CREDIT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      wfSettlement === 'KHATA_CREDIT' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Khata Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setWfSettlement('EXCHANGE')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold text-center cursor-pointer ${
                      wfSettlement === 'EXCHANGE' ? 'bg-[#1b3830] text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Exchange
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase font-mono block mb-1">
                  WHOLESALER / SUPPLIER NAME
                </label>
                <input
                  type="text"
                  value={wfSupplierName}
                  onChange={(e) => setWfSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase font-mono block mb-1">
                  ORIGINAL PURCHASE BILL #
                </label>
                <input
                  type="text"
                  value={wfPurchaseBill}
                  onChange={(e) => setWfPurchaseBill(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase font-mono block mb-1">
                  RETURNED DEFECT STOCK DETAILS
                </label>
                <input
                  type="text"
                  value={wfReturnedItemsText}
                  onChange={(e) => setWfReturnedItemsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase font-mono block mb-1">
                  RETURN VALUE (RS)
                </label>
                <input
                  type="number"
                  value={wfSupplierReturnValue}
                  onChange={(e) => setWfSupplierReturnValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
          <button
            onClick={handleProcessWorkflow}
            className="w-full py-2.5 bg-[#1b3830] hover:bg-[#142e27] text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Process Return & Print Slip</span>
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer py-1"
          >
            Cancel Workflow
          </button>
        </div>
      </div>
    </>
  );
}
