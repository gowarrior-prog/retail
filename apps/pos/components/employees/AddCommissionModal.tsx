'use client';

import React, { useState, useEffect } from 'react';
import { X, Award } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';

interface AddCommissionModalProps {
  employee: any;
  onClose: () => void;
  onSuccess: (salesAmount: number, rate: number, creditVal: number) => void;
}

export default function AddCommissionModal({ employee, onClose, onSuccess }: AddCommissionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [salesAmount, setSalesAmount] = useState<number>(200000);
  const [commRate, setCommRate] = useState<number>(2.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const calculatedCommission = Math.round((salesAmount * commRate) / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesAmount || salesAmount <= 0 || calculatedCommission <= 0) return;

    setIsSubmitting(true);
    try {
      playToastAudio('add');
      showCatalogToast(`Commission Credit Rs. ${calculatedCommission.toLocaleString()} added to ${employee.supplier_name}!`, 'add');
      onSuccess(salesAmount, commRate, calculatedCommission);
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Could not add commission'}`);
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
            <Award className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Add Sales Commission</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">{employee.supplier_name} • {employee.emp_code}</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              TOTAL SALES VOLUME (RS) *
            </label>
            <input
              type="number"
              required
              min={1}
              value={salesAmount || ''}
              onChange={(e) => setSalesAmount(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 200000"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              COMMISSION RATE (%) *
            </label>
            <input
              type="number"
              required
              step="0.1"
              min={0.1}
              value={commRate || ''}
              onChange={(e) => setCommRate(parseFloat(e.target.value) || 0)}
              placeholder="2.0"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Calculated Commission Preview */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between font-mono text-xs">
            <span className="font-sans font-semibold text-blue-900">Total Credit Amount:</span>
            <span className="font-extrabold text-blue-700 text-sm">Rs. {calculatedCommission.toLocaleString()}</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !salesAmount || calculatedCommission <= 0}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Crediting...' : 'Credit Commission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
