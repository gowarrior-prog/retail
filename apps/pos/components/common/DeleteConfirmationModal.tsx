'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  title?: string;
  entityName?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function DeleteConfirmationModal({
  title = 'Confirm Deletion',
  entityName = '',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onClose,
  onConfirm,
}: DeleteConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 220);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      handleAnimatedClose();
    } catch (e) {
      console.error('Delete confirm error:', e);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-200 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white rounded-[28px] p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center flex flex-col items-center transition-all duration-200 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
        }`}
      >
        {/* Top-Right Close 'X' Button */}
        <button
          onClick={handleAnimatedClose}
          className="absolute top-4.5 right-4.5 p-1 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Soft Red Container with Trash Bin Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500 shadow-2xs">
          <Trash2 className="w-6 h-6 text-rose-500 stroke-[2.2]" />
        </div>

        {/* Bold Title */}
        <h3 className="font-bold text-base text-slate-900 tracking-tight mb-1">
          {title}
        </h3>

        {/* Description Subtext */}
        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[280px]">
          {message || (entityName ? `Are you sure you want to delete ${entityName}?` : 'Are you sure you want to delete this item?')}
        </p>

        {/* Side-by-side Equal Action Buttons matching screenshot */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <button
            type="button"
            onClick={handleAnimatedClose}
            className="py-2.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-slate-700 font-bold text-xs rounded-2xl border border-slate-200/90 transition cursor-pointer shadow-2xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-600 font-bold text-xs rounded-2xl border border-rose-200 transition cursor-pointer shadow-2xs"
          >
            {isSubmitting ? 'Deleting...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
