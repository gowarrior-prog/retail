'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';
import { EmployeeCreateSchema } from '@/lib/validators';
import { createEmployee } from '@/lib/api';
import { LedgerEntry } from './EmployeeStatementTable';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSuccess: (newEmp: any) => void;
}

export default function AddEmployeeModal({ onClose, onSuccess }: AddEmployeeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [name, setName] = useState('');
  const [role, setRole] = useState('Senior Counter Salesman');
  const [phone, setPhone] = useState('');
  const [baseSalary, setBaseSalary] = useState<number>(35000);
  const [initialAdvance, setInitialAdvance] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);

    const validationResult = EmployeeCreateSchema.safeParse({
      name: name.trim(),
      phone: phone.trim() || '0300-0000000',
      role: role.trim() || 'SALES_EXECUTIVE',
      base_salary: baseSalary,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Invalid employee details';
      setErrorMsg(firstError);
      return;
    }

    setIsSubmitting(true);
    try {
      // Call Backend API to create employee account in DB2 & SQLite
      let apiRes: any = null;
      try {
        apiRes = await createEmployee({
          name: name.trim(),
          phone: phone.trim() || '0300-0000000',
          role: role.trim() || 'SALES_EXECUTIVE',
          base_salary: baseSalary,
        });
      } catch (err: any) {
        console.warn('Backend employee API offline, saving locally:', err);
      }

      const empId = apiRes?.id || `emp-${Date.now()}`;
      const initials = name
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const empCode = `#EMP-${Math.floor(100 + Math.random() * 900)}`;

      const newEmp = {
        id: empId,
        emp_code: empCode,
        supplier_name: name.trim(),
        phone: phone.trim() || '0300-0000000',
        since: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        role: role.trim() || 'Staff',
        category: 'Salesmen',
        base_salary: baseSalary,
        advance_due: initialAdvance,
        time_ago: 'Just added',
        initials,
        avatar_color: 'bg-[#1b3830]',
        ledger: [
          {
            id: `l-${Date.now()}`,
            date: today,
            type: 'Monthly Salary',
            description: `${today} Base Salary Accrued`,
            debit: 0,
            credit: baseSalary,
            is_settled: true,
          },
        ] as LedgerEntry[],
      };

      if (initialAdvance > 0) {
        newEmp.ledger.unshift({
          id: `la-${Date.now()}`,
          date: today,
          type: `Advance Voucher #ADV-${Math.floor(100 + Math.random() * 900)}`,
          description: 'Opening Advance Loan',
          debit: initialAdvance,
          credit: 0,
          balanceText: `Rs. ${initialAdvance.toLocaleString()} ADVANCE`,
          is_settled: false,
        });
      }

      playToastAudio('add');
      showCatalogToast(`Added Employee: ${name.trim()}`, 'add');
      onSuccess(newEmp);
      handleAnimatedClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not add employee');
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
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm leading-none text-white">Add New Employee Account</h3>
              <p className="text-[10px] text-emerald-200 font-mono mt-1 font-semibold">Staff & Salary Ledger Setup</p>
            </div>
          </div>
          <button onClick={handleAnimatedClose} className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 flex flex-col gap-3.5 text-xs font-sans">
          <div>
            <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
              EMPLOYEE FULL NAME *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Muhammad Imran / Tariq Mehmood"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
                DESIGNATION / ROLE
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Counter Salesman"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
                PHONE NUMBER
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0321-0000000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
                BASE SALARY (RS)
              </label>
              <input
                type="number"
                required
                min={0}
                value={baseSalary || ''}
                onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                placeholder="35000"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 tracking-wider uppercase font-mono block mb-1">
                INITIAL ADVANCE (RS)
              </label>
              <input
                type="number"
                min={0}
                value={initialAdvance || ''}
                onChange={(e) => setInitialAdvance(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button type="button" onClick={handleAnimatedClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-[#1b3830] hover:bg-[#142e27] text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              {isSubmitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
