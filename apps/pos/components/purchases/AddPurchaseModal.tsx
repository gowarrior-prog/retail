'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, FileText } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface AddPurchaseModalProps {
  supplier: any;
  onClose: () => void;
  onSuccess: (info?: any) => void;
}

export default function AddPurchaseModal({ supplier, onClose, onSuccess }: AddPurchaseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [billNumber, setBillNumber] = useState(`PUR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [itemsSummary, setItemsSummary] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [paidNow, setPaidNow] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseAmount || purchaseAmount <= 0) return;
    setIsSubmitting(true);
    try {
      playToastAudio('add');
      showCatalogToast(`Added Purchase Rs. ${purchaseAmount.toLocaleString()} to ${supplier.supplier_name}!`, 'add');
      onSuccess({
        bill_number: billNumber.trim() || `PUR-${Date.now()}`,
        description: itemsSummary.trim() || 'Stock Fabric Purchase',
        purchase_amount: purchaseAmount,
        paid_amount: paidNow,
      });
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error adding purchase record'}`);
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
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Add Purchase Entry</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">{supplier.supplier_name} • {supplier.phone}</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-mono flex justify-between">
            <span className="text-slate-600">Current Payable Balance:</span>
            <span className="font-bold text-slate-900">Rs. {(supplier.total_balance || 0).toLocaleString()}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              BILL / INVOICE # (WHOLESALER REF)
            </label>
            <input
              type="text"
              required
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. BILL-8832 / INV-990"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              ITEMS / STOCK SUMMARY
            </label>
            <input
              type="text"
              required
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              placeholder="e.g. 50 Cotton Suits, 20 Lawn Rolls, 10 Silk Thaan"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              PURCHASE AMOUNT (RS) - MAAL KI KUL KEEMAT
            </label>
            <input
              type="number"
              required
              min={1}
              value={purchaseAmount || ''}
              onChange={(e) => setPurchaseAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter purchase cost"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              PAID AMOUNT NOW (RS) - IF ANY INITIAL PAYMENT MADE
            </label>
            <input
              type="number"
              min={0}
              value={paidNow || ''}
              onChange={(e) => setPaidNow(parseFloat(e.target.value) || 0)}
              placeholder="0 (if fully on credit)"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !purchaseAmount}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Add Purchase Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
