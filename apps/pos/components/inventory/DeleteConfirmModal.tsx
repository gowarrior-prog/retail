'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  productName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ productName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedCancel = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onCancel(), 250);
  };

  const handleAnimatedConfirm = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onConfirm(), 250);
  };

  return (
    <div
      onClick={handleAnimatedCancel}
      className={`fixed inset-0 z-[999999] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-250 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-3xl p-7 shadow-2xl border border-slate-200/90 max-w-md w-full text-center flex flex-col items-center gap-4 relative transition-all duration-250 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        <button
          onClick={handleAnimatedCancel}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200/80 flex items-center justify-center shrink-0">
          <Trash2 className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-1.5 px-2">
          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">Confirm Product Deletion</h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Are you sure you want to delete 
          </p>
        </div>

        <div className="flex gap-2.5 w-full mt-1">
          <button
            type="button"
            onClick={handleAnimatedCancel}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs border border-slate-300/80 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAnimatedConfirm}
            className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-600 rounded-xl font-extrabold text-xs border border-rose-200/90 cursor-pointer transition shadow-2xs"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
