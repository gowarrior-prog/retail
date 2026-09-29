'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { showCatalogToast } from '@/lib/toast';

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balanceText?: string;
  is_settled?: boolean;
}

export interface EmployeeRecord {
  id: string;
  emp_code: string;
  supplier_name: string;
  phone: string;
  since: string;
  role: string;
  category: 'Salesmen' | 'Cashiers' | 'Karigar' | 'Manager';
  base_salary: number;
  advance_due: number;
  time_ago: string;
  initials: string;
  avatar_color?: string;
  ledger: LedgerEntry[];
}

const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    id: 'emp-1',
    emp_code: '#EMP-014',
    supplier_name: 'Muhammad Imran',
    phone: '0321-4556677',
    since: 'Jan 2022',
    role: 'Senior Counter Salesman',
    category: 'Salesmen',
    base_salary: 35000,
    advance_due: 5000,
    time_ago: 'Active',
    initials: 'MI',
    avatar_color: 'bg-[#1b3830]',
    ledger: [
      { id: 'l1', date: '28 Sep 2026', type: 'Salary Payout #SL-0926', description: 'Net September Salary settled via Cash', debit: 36000, credit: 0, is_settled: true },
      { id: 'l2', date: '22 Sep 2026', type: 'Attendance Bonus', description: 'Full attendance & Sunday shift bonus', debit: 0, credit: 2000, is_settled: true },
      { id: 'l3', date: '15 Sep 2026', type: 'Commission Credit', description: '2.0% Wholesale POS commission on Rs. 200,000 sales', debit: 0, credit: 4000, is_settled: true },
      { id: 'l4', date: '05 Sep 2026', type: 'Advance Voucher #ADV-108', description: 'Emergency cash advance drawn from counter cash', debit: 5000, credit: 0, balanceText: 'Rs. 5,000 ADVANCE', is_settled: false },
      { id: 'l5', date: '01 Sep 2026', type: 'Monthly Salary', description: 'September 2026 Base Salary Accrued', debit: 0, credit: 35000, is_settled: true },
    ],
  },
  {
    id: 'emp-2',
    emp_code: '#EMP-008',
    supplier_name: 'Tariq Mehmood',
    phone: '0300-8899112',
    since: 'Mar 2021',
    role: 'Cashier & Accounts',
    category: 'Cashiers',
    base_salary: 40000,
    advance_due: 0,
    time_ago: 'Present',
    initials: 'TM',
    avatar_color: 'bg-slate-700',
    ledger: [{ id: 'l6', date: '01 Sep 2026', type: 'Monthly Salary', description: 'September 2026 Base Salary Accrued', debit: 0, credit: 40000, is_settled: true }],
  },
  {
    id: 'emp-3',
    emp_code: '#EMP-021',
    supplier_name: 'Ustad Rafiq',
    phone: '0312-7766554',
    since: 'Jun 2020',
    role: 'Master Karigar (Stitch Unit)',
    category: 'Karigar',
    base_salary: 23100,
    advance_due: 12000,
    time_ago: '42 Suits Done',
    initials: 'UR',
    avatar_color: 'bg-amber-800',
    ledger: [
      { id: 'l7', date: '10 Sep 2026', type: 'Advance Voucher #ADV-112', description: 'Stitching material & advance drawing', debit: 12000, credit: 0, balanceText: 'Rs. 12,000 ADVANCE', is_settled: false },
      { id: 'l8', date: '01 Sep 2026', type: 'Stitching Work Credit', description: '42 Suits stitched @ Rs. 550/suit', debit: 0, credit: 23100, is_settled: true },
    ],
  },
];

/* ── Lightweight Inline Modal Wrapper Component ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 max-w-md w-full space-y-4 font-sans animate-in zoom-in-95 duration-200">
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'advance' | 'clear'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active Modal View
  const [activeModal, setActiveModal] = useState<'add' | 'pay' | 'adv' | 'comm' | null>(null);

  // Form States
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Counter Salesman');
  const [empPhone, setEmpPhone] = useState('');
  const [empSalary, setEmpSalary] = useState(35000);
  const [empAdv, setEmpAdv] = useState(0);

  const [amountInput, setAmountInput] = useState(0);
  const [noteInput, setNoteInput] = useState('');
  const [commRate, setCommRate] = useState(2.0);

  // SSR Hydration & LocalStorage
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pos_employee_records_v3');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
            setEmployees(parsed);
            setSelectedId(parsed[0].id);
            return;
          }
        }
      } catch {}
      setEmployees(INITIAL_EMPLOYEES);
      if (INITIAL_EMPLOYEES[0]?.id) setSelectedId(INITIAL_EMPLOYEES[0].id);
    }
  }, []);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('pos_employee_records_v3', JSON.stringify(employees));
    }
  }, [employees, isMounted]);

  // Filter & Selected Employee Memoization
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const match = !q || emp.supplier_name.toLowerCase().includes(q) || emp.phone.includes(q) || emp.emp_code.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q);
      if (!match) return false;
      if (filterTab === 'advance') return emp.advance_due > 0;
      if (filterTab === 'clear') return emp.advance_due <= 0;
      return true;
    });
  }, [employees, searchQuery, filterTab]);

  const activeEmployee = useMemo<EmployeeRecord | null>(() => {
    if (!selectedId) return filteredEmployees[0] || employees[0] || INITIAL_EMPLOYEES[0] || null;
    return employees.find((e) => String(e.id) === String(selectedId)) || filteredEmployees[0] || employees[0] || INITIAL_EMPLOYEES[0] || null;
  }, [employees, selectedId, filteredEmployees]);

  const totalAdvance = useMemo(() => employees.reduce((sum, e) => sum + (e.advance_due || 0), 0), [employees]);

  const totals = useMemo(() => {
    if (!activeEmployee) return { earned: 0, paid: 0 };
    const earned = activeEmployee.ledger.reduce((sum, i) => sum + (i.credit || 0), 0);
    const paid = activeEmployee.ledger.reduce((sum, i) => sum + (i.debit || 0), 0);
    return { earned, paid };
  }, [activeEmployee]);

  // Actions
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const initials = empName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      emp_code: `#EMP-${Math.floor(100 + Math.random() * 900)}`,
      supplier_name: empName.trim(),
      phone: empPhone || '0300-0000000',
      since: 'Sep 2026',
      role: empRole,
      category: 'Salesmen',
      base_salary: empSalary,
      advance_due: empAdv,
      time_ago: 'Active',
      initials,
      avatar_color: 'bg-[#1b3830]',
      ledger: [{ id: `l-${Date.now()}`, date: today, type: 'Monthly Salary', description: `${today} Base Salary Accrued`, debit: 0, credit: empSalary, is_settled: true }],
    };
    if (empAdv > 0) {
      newEmp.ledger.unshift({ id: `la-${Date.now()}`, date: today, type: `Advance Voucher #ADV-${Math.floor(100 + Math.random() * 900)}`, description: 'Opening Advance Loan', debit: empAdv, credit: 0, balanceText: `Rs. ${empAdv.toLocaleString()} ADVANCE`, is_settled: false });
    }
    setEmployees((prev) => [newEmp, ...prev]);
    setSelectedId(newEmp.id);
    showCatalogToast(`Added Employee: ${empName}`, 'add');
    setActiveModal(null);
    setEmpName('');
    setEmpPhone('');
    setEmpAdv(0);
  };

  const handleLedgerAction = (action: 'pay' | 'adv' | 'comm', e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || amountInput <= 0) return;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    setEmployees((prev) =>
      prev.map((emp) => {
        if (String(emp.id) === String(activeEmployee.id)) {
          let newEntry: LedgerEntry;
          let newAdv = emp.advance_due;
          if (action === 'pay') {
            newEntry = { id: `lp-${Date.now()}`, date: today, type: `Salary Payout #SL-${Math.floor(100 + Math.random() * 900)}`, description: noteInput || 'Net Salary Disbursed', debit: amountInput, credit: 0, is_settled: true };
          } else if (action === 'adv') {
            newAdv += amountInput;
            newEntry = { id: `la-${Date.now()}`, date: today, type: `Advance Voucher #ADV-${Math.floor(100 + Math.random() * 900)}`, description: noteInput || 'Emergency Cash Advance', debit: amountInput, credit: 0, balanceText: `Rs. ${amountInput.toLocaleString()} ADVANCE`, is_settled: false };
          } else {
            const commVal = Math.round((amountInput * commRate) / 100);
            newEntry = { id: `lc-${Date.now()}`, date: today, type: 'Commission Credit', description: `${commRate}% POS Sales Commission on Rs. ${amountInput.toLocaleString()}`, debit: 0, credit: commVal, is_settled: true };
          }
          return { ...emp, advance_due: newAdv, ledger: [newEntry, ...emp.ledger] };
        }
        return emp;
      })
    );
    showCatalogToast(`Entry recorded for ${activeEmployee.supplier_name}`, 'add');
    setActiveModal(null);
    setNoteInput('');
  };

  const handleDeleteEmployee = () => {
    if (!activeEmployee || !confirm(`Delete employee account for ${activeEmployee.supplier_name}?`)) return;
    showCatalogToast(`Deleted: ${activeEmployee.supplier_name}`, 'delete');
    const updated = employees.filter((e) => String(e.id) !== String(activeEmployee.id));
    setEmployees(updated);
    setSelectedId(updated[0]?.id || null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeEmployee) return;
    setEmployees((prev) => prev.map((e) => (String(e.id) === String(activeEmployee.id) ? { ...e, ledger: e.ledger.filter((i) => String(i.id) !== String(itemId)) } : e)));
    showCatalogToast('Entry removed', 'delete');
  };

  if (!isMounted) return <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs">Loading...</div>;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden font-sans p-1">
      <div className="grid grid-cols-12 flex-1 w-full h-full min-h-0 bg-[#f8fafc] overflow-hidden">
        {/* LEFT PANEL */}
        <div className="col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-3.5 gap-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-700 text-xs tracking-wider uppercase truncate">EMPLOYEE LEDGER</h4>
            <button onClick={() => setActiveModal('add')} className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg cursor-pointer transition active:scale-95 shadow-2xs shrink-0">+ NEW EMPLOYEE</button>
          </div>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employee..." className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b3830] transition" />
          <div className="flex items-center gap-2">
            {(['all', 'advance', 'clear'] as const).map((tab) => (
              <button key={tab} onClick={() => setFilterTab(tab)} className={`px-3.5 py-1 rounded-full text-xs transition cursor-pointer active:scale-95 ${filterTab === tab ? 'bg-[#1b3830] text-white font-medium shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal'}`}>{tab === 'all' ? 'All' : tab === 'advance' ? 'Advance' : 'Clear'}</button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-normal text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span>TOTAL ADVANCE: <strong className="text-slate-900 font-semibold ml-1 text-xs font-mono">Rs. {totalAdvance.toLocaleString()}</strong></span>
            <span className="text-slate-500 text-xs">{employees.length} Employees</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5">
            {filteredEmployees.map((emp) => {
              const isSel = activeEmployee && String(activeEmployee.id) === String(emp.id);
              return (
                <div key={emp.id} onClick={() => setSelectedId(emp.id)} className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between active:scale-98 ${isSel ? 'bg-[#e6f4ea] border-emerald-400/80 shadow-2xs' : 'bg-white border-slate-200/80 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8.5 h-8.5 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 text-white ${emp.avatar_color || (isSel ? 'bg-[#1b3830]' : 'bg-slate-600')}`}>{emp.initials}</div>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-xs text-slate-900 truncate leading-snug">{emp.supplier_name}</h5>
                      <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="font-semibold font-mono text-slate-800 text-xs">Rs. {(emp.advance_due || 0).toLocaleString()}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center font-bold text-[10px] ${emp.advance_due > 0 ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'}`}>{emp.advance_due > 0 ? '!' : '✓'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-8 lg:col-span-9 p-4 flex flex-col h-full overflow-hidden gap-3.5 bg-[#f8fafc]">
          {activeEmployee && (
            <>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{activeEmployee.supplier_name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono font-medium text-slate-600">{activeEmployee.emp_code}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-normal mt-1">
                    <span>{activeEmployee.phone}</span><span>•</span><span>Since {activeEmployee.since}</span><span>•</span><span>{activeEmployee.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAmountInput(totals.earned > totals.paid ? totals.earned - totals.paid : activeEmployee.base_salary); setActiveModal('pay'); }} className="px-3.5 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs">Pay Salary</button>
                  <button onClick={() => { setAmountInput(5000); setActiveModal('adv'); }} className="px-3.5 py-1.5 bg-[#e6f4ea] hover:bg-[#d5ecd9] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs">Give Advance</button>
                  <button onClick={() => { setAmountInput(200000); setActiveModal('comm'); }} className="px-3.5 py-1.5 bg-[#eef4ff] hover:bg-[#dbe7ff] text-blue-800 border border-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs">+ Add Commission</button>
                  <button onClick={() => window.print()} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition cursor-pointer active:scale-95 shadow-2xs">Download PDF</button>
                  <button onClick={handleDeleteEmployee} className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95">Delete</button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 font-semibold text-xs text-slate-700 uppercase tracking-wider">SALARY & LEDGER STATEMENT</div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-[10.5px] uppercase font-semibold text-slate-500">
                        <th className="p-3 font-semibold">DATE</th><th className="p-3 font-semibold">TYPE / VOUCHER</th><th className="p-3 font-semibold">DESCRIPTION / DETAILS</th><th className="p-3 text-right font-semibold">EARNED AMOUNT</th><th className="p-3 text-right font-semibold">PAID AMOUNT</th><th className="p-3 text-right font-semibold">BALANCE</th><th className="p-3 text-center w-16 font-semibold">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {activeEmployee.ledger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500 text-xs">{item.date}</td>
                          <td className="p-3 font-mono font-medium text-slate-800">{item.type}</td>
                          <td className="p-3 font-medium text-slate-800">{item.description}</td>
                          <td className="p-3 text-right font-mono font-medium text-slate-800">{item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}</td>
                          <td className="p-3 text-right font-mono font-medium text-slate-800">{item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}</td>
                          <td className="p-3 text-right font-mono">{item.is_settled ? <div className="flex justify-end"><div className="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</div></div> : <span className="font-medium text-slate-800">{item.balanceText || `Rs. ${item.debit.toLocaleString()} ADVANCE`}</span>}</td>
                          <td className="p-3 text-center"><button onClick={() => handleDeleteItem(item.id)} className="px-2 py-0.5 text-slate-400 hover:text-rose-600 text-[11px] transition cursor-pointer active:scale-95 font-medium">Delete</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#eef4ff] border border-blue-200 rounded-2xl p-3 justify-center flex text-xs font-normal text-slate-700 shrink-0 shadow-2xs">
                <div className="flex items-center gap-6 text-xs">
                  <span>TOTAL EARNED: <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">Rs. {totals.earned.toLocaleString()}</strong></span>
                  <span>TOTAL PAID: <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">Rs. {totals.paid.toLocaleString()}</strong></span>
                  <div className="bg-[#fce8e6] text-rose-900 px-3 py-1 rounded-xl border border-rose-200 font-mono font-semibold text-xs">NET ADVANCE DUE: Rs. {(activeEmployee.advance_due || 0).toLocaleString()}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* INLINE MODALS */}
      {activeModal === 'add' && (
        <Modal title="Add New Employee Account" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
            <input required type="text" placeholder="Full Name *" value={empName} onChange={(e) => setEmpName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Role / Designation" value={empRole} onChange={(e) => setEmpRole(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
              <input type="text" placeholder="Phone Number" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Base Salary (Rs)" value={empSalary} onChange={(e) => setEmpSalary(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none" />
              <input type="number" placeholder="Initial Advance (Rs)" value={empAdv} onChange={(e) => setEmpAdv(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-600 font-medium cursor-pointer active:scale-95">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-[#1b3830] text-white font-semibold rounded-xl cursor-pointer active:scale-95 shadow-2xs">Save Employee</button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'pay' && activeEmployee && (
        <Modal title={`Disburse Salary (${activeEmployee.supplier_name})`} onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleLedgerAction('pay', e)} className="space-y-3 text-xs">
            <input required type="number" value={amountInput} onChange={(e) => setAmountInput(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none" />
            <input type="text" placeholder="Remarks / Details" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-600 font-medium cursor-pointer active:scale-95">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-rose-700 text-white font-semibold rounded-xl cursor-pointer active:scale-95 shadow-2xs">Confirm Payout</button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'adv' && activeEmployee && (
        <Modal title={`Issue Advance Loan (${activeEmployee.supplier_name})`} onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleLedgerAction('adv', e)} className="space-y-3 text-xs">
            <input required type="number" value={amountInput} onChange={(e) => setAmountInput(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-amber-800 focus:outline-none" />
            <input type="text" placeholder="Reason / Note" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none" />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-600 font-medium cursor-pointer active:scale-95">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer active:scale-95 shadow-2xs">Issue Advance</button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === 'comm' && activeEmployee && (
        <Modal title={`Add Sales Commission (${activeEmployee.supplier_name})`} onClose={() => setActiveModal(null)}>
          <form onSubmit={(e) => handleLedgerAction('comm', e)} className="space-y-3 text-xs">
            <input required type="number" placeholder="Sales Amount (Rs)" value={amountInput} onChange={(e) => setAmountInput(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none" />
            <input type="number" step="0.1" placeholder="Rate (%)" value={commRate} onChange={(e) => setCommRate(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-blue-700 focus:outline-none" />
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex justify-between font-mono text-xs"><span className="font-sans font-semibold text-blue-900">Credit:</span><span className="font-extrabold text-blue-700">Rs. {Math.round((amountInput * commRate) / 100).toLocaleString()}</span></div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 text-slate-600 font-medium cursor-pointer active:scale-95">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-xl cursor-pointer active:scale-95 shadow-2xs">Credit Commission</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
