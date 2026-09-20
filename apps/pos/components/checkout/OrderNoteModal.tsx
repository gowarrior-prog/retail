'use client';

import React, { useState } from 'react';
import { X, FileText, Check, Trash2 } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';

interface OrderNoteModalProps {
  onClose: () => void;
}

export default function OrderNoteModal({ onClose }: OrderNoteModalProps) {
  const { orderNote, setOrderNote } = useCartStore();
  const [noteText, setNoteText] = useState(orderNote || '');

  const handleSave = () => {
    setOrderNote(noteText.trim());
    onClose();
  };

  const handleClear = () => {
    setNoteText('');
    setOrderNote('');
    onClose();
  };

  const quickNotes = [
    'Customer Tailoring Required',
    'Special Discount Approved by Bilal Sb',
    'Partial Delivery / Suit Stitching Pending',
    'Urgent Delivery Before Friday',
    'Exchange Within 7 Days Allowed',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Order Remarks / Bill Note</h3>
              <p className="text-[11px] text-slate-500 font-medium">Add special instructions printed on invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Custom Note / Remarks:</label>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g., Suite stitching reference, tailor name, special client instruction..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none font-medium"
              autoFocus
            />
          </div>

          {/* Quick Note Presets */}
          <div>
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Shortcuts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNoteText(q)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-[11px] font-medium text-slate-700 transition cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {orderNote && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-rose-200 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
