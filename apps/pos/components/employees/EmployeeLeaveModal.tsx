'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { updateEmployeeLeave } from '@/lib/api';

interface EmployeeLeaveModalProps {
  employee: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmployeeLeaveModal({ employee, onClose, onSuccess }: EmployeeLeaveModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState<string>(employee.leave_status || 'ON_LEAVE');
  const [reason, setReason] = useState<string>(employee.leave_reason || '');
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
    setIsSubmitting(true);
    try {
      await updateEmployeeLeave(employee.id, leaveStatus, reason.trim());
      showCatalogToast(`Employee status updated to ${leaveStatus.replace('_', ' ')}!`, 'add');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pos-data-updated'));
      }
      onSuccess();
      handleAnimatedClose();
    } catch (err: any) {
      alert(`Error: ${err.message || 'Could not update leave status'}`);
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
            <Calendar className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Employee Leave & Attendance</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">
                {employee.supplier_name || employee.name} • {employee.role}
              </p>
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
              ATTENDANCE / LEAVE STATUS *
            </label>
            <select
              value={leaveStatus}
              onChange={(e) => setLeaveStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            >
              <option value="PRESENT">✅ PRESENT (Hazir)</option>
              <option value="ON_LEAVE">🏖️ ON LEAVE (Chutti Par)</option>
              <option value="SICK_LEAVE">🤒 SICK LEAVE (Bimar Chutti)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              LEAVE REASON / NOTES
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. 2 days leave for personal work"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#152e27] text-white font-bold text-xs rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Update Leave Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
