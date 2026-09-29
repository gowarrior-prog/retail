'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Phone, DollarSign } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface AddSupplierModalProps {
  onClose: () => void;
  onSuccess: (newSupplier: any) => void;
}

export default function AddSupplierModal({ onClose, onSuccess }: AddSupplierModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [balance, setBalance] = useState<number>(0);
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
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const initials = name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const bal = Number(balance) || 0;

      const newSupplier = {
        id: `sup-${Date.now()}`,
        supplier_name: name.trim(),
        phone: phone.trim() || '0300-0000000',
        since: 'Active',
        total_purchases: bal > 0 ? 1 : 0,
        total_balance: bal,
        time_ago: 'Just added',
        initials,
        avatar_color: 'bg-[#1b3830]',
        ledger:
          bal > 0
            ? [
                {
                  id: `leg-sup-init-${Date.now()}`,
                  date: new Date().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }),
                  bill_number: `INV-OPEN-${Math.floor(100 + Math.random() * 900)}`,
                  description: 'Opening Stock Balance',
                  type: 'Purchase',
                  purchase_amount: bal,
                  paid_amount: 0,
                  balanceText: `Rs. ${bal.toLocaleString()} PAYABLE`,
                  is_due: true,
                },
              ]
            : [],
      };

      playToastAudio('add');
      showCatalogToast(`New Supplier '${name.trim()}' Created!`, 'add');
      onSuccess(newSupplier);
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error creating supplier'}`);
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
        {/* Header */}
        <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Add New Supplier</h3>
              <p className="text-[11px] text-emerald-200 mt-0.5">Wholesaler & Vendor Registration</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5">
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              SUPPLIER / WHOLESALER NAME
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gul Ahmed Silk Mills / Haji Fabrics"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              PHONE NUMBER
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-1234567"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              INITIAL PAYABLE BALANCE (DUE TO SUPPLIER)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center shadow-xs transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Creating...' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
