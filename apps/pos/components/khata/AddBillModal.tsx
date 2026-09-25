'use client';

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { createKhataCustomer } from '@/lib/api';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface AddBillModalProps {
  client: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBillModal({ client, onClose, onSuccess }: AddBillModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [billAmount, setBillAmount] = useState<number>(0);
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
    if (!billAmount || billAmount <= 0) return;
    setIsSubmitting(true);
    try {
      const newBal = (client.total_balance || 0) + billAmount;
      await createKhataCustomer({
        customer_name: client.customer_name || client.name,
        phone: client.phone || '0300-0000000',
        initial_balance: newBal,
      });
      playToastAudio('add');
      showCatalogToast(`Added Rs. ${billAmount.toLocaleString()} bill to ${client.customer_name}'s Khata!`, 'add');
      onSuccess();
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Notice: ${err.message || 'Error adding bill to Khata'}`);
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
              <h3 className="font-bold text-sm leading-none text-white">Add New Bill / Udhari to Khata</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">{client.customer_name} • {client.phone}</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-mono flex justify-between">
            <span className="text-slate-600">Current Balance:</span>
            <span className="font-bold text-slate-900">Rs. {(client.total_balance || 0).toLocaleString()}</span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              NEW BILL AMOUNT (RS.) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={billAmount}
              onChange={(e) => setBillAmount(parseFloat(e.target.value) || 0)}
              placeholder="Enter amount"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !billAmount}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Add Bill to Khata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
