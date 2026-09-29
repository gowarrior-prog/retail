'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Search, Check, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface SupplierReturnModalProps {
  onClose: () => void;
  onSuccess: (newReturn: any) => void;
}

export default function SupplierReturnModal({ onClose, onSuccess }: SupplierReturnModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Supplier list from localStorage
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  // Form Fields
  const [purchaseBill, setPurchaseBill] = useState('');
  const [itemsReturned, setItemsReturned] = useState('');
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [reason, setReason] = useState('Defective Fabric');
  const [settlementStatus, setSettlementStatus] = useState<'ADJUSTED_IN_LEDGER' | 'CASH_RECEIVED'>('ADJUSTED_IN_LEDGER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pos_supplier_records_v1');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setSuppliers(parsed);
        } catch {}
      }
    }
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !returnAmount || returnAmount <= 0) return;
    setIsSubmitting(true);

    try {
      const returnCode = `#SR-${Math.floor(300 + Math.random() * 900)}`;

      const newReturn = {
        id: `sr-${Date.now()}`,
        return_code: returnCode,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        supplier_name: selectedSupplier.supplier_name,
        purchase_bill: purchaseBill || `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
        items_returned: itemsReturned || 'Returned Defected Stock',
        total_value: returnAmount,
        settlement_status: settlementStatus === 'ADJUSTED_IN_LEDGER' ? 'Adjusted in Ledger' : 'Cash Received',
        reason: reason || 'Defective Fabric',
        status: 'Completed',
      };

      // Automatic Ledger Sync: Reduce Supplier Total Payable in pos_supplier_records_v1!
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('pos_supplier_records_v1');
        if (stored) {
          try {
            const records = JSON.parse(stored);
            const updated = records.map((sup: any) => {
              if (String(sup.id) === String(selectedSupplier.id)) {
                const newBal = Math.max(0, (sup.total_balance || 0) - returnAmount);
                return {
                  ...sup,
                  total_balance: newBal,
                  ledger: [
                    {
                      id: `leg-sr-${Date.now()}`,
                      date: newReturn.date,
                      bill_number: returnCode,
                      description: `Debit Note (${newReturn.items_returned})`,
                      type: 'Payment',
                      purchase_amount: 0,
                      paid_amount: returnAmount,
                      is_due: false,
                    },
                    ...(sup.ledger || []),
                  ],
                };
              }
              return sup;
            });
            localStorage.setItem('pos_supplier_records_v1', JSON.stringify(updated));
          } catch {}
        }
      }

      playToastAudio('add');
      showCatalogToast(`Supplier Return ${returnCode} Debit Note generated!`, 'add');
      onSuccess(newReturn);
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error processing supplier return'}`);
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
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">New Supplier Return (Debit Note)</h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">Purchase Return to Wholesaler & Vendor</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5">
          {/* Step 1: Select Supplier */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              SELECT WHOLESALER / SUPPLIER
            </label>
            <select
              required
              value={selectedSupplier?.id || ''}
              onChange={(e) => {
                const found = suppliers.find((s) => String(s.id) === e.target.value);
                setSelectedSupplier(found || null);
              }}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.supplier_name} (Payable: Rs. {(sup.total_balance || 0).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Original Purchase Bill # */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              ORIGINAL PURCHASE BILL # / REF CODE
            </label>
            <input
              type="text"
              required
              value={purchaseBill}
              onChange={(e) => setPurchaseBill(e.target.value)}
              placeholder="e.g. BILL-8832 / INV-9901"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Step 3: Returned Stock Description & Quantity */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              RETURNED STOCK (QUANTITY / METERS / ITEMS)
            </label>
            <input
              type="text"
              required
              value={itemsReturned}
              onChange={(e) => setItemsReturned(e.target.value)}
              placeholder="e.g. 50 Meters Silk Roll - Defect, 10 Cotton Suits"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Step 4: Total Return Value */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              TOTAL RETURN VALUE (RS)
            </label>
            <input
              type="number"
              required
              min={1}
              value={returnAmount || ''}
              onChange={(e) => setReturnAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter value of returned stock"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Step 5: Reason for Return */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              REASON FOR RETURN
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            >
              <option value="Defective Fabric">Defective Fabric (Hole / Weave Fault)</option>
              <option value="Wrong Shade/Color">Wrong Shade / Color Mismatch</option>
              <option value="Damaged Transport">Damaged in Transport</option>
              <option value="Excess Shipment">Excess Shipment / Unordered</option>
            </select>
          </div>

          {/* Step 6: Settlement Method */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              SETTLEMENT TYPE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettlementStatus('ADJUSTED_IN_LEDGER')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settlementStatus === 'ADJUSTED_IN_LEDGER'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Adjust in Supplier Ledger (- Payable)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettlementStatus('CASH_RECEIVED')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  settlementStatus === 'CASH_RECEIVED'
                    ? 'bg-[#1b3830] border-[#1b3830] text-white shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cash Received from Vendor</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || !selectedSupplier || !returnAmount}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-2xs transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Processing...' : 'Issue Debit Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
