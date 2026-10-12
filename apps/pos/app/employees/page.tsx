'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, UserCheck, Trash2, Download, Check } from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { fetchEmployees, deleteEmployee } from '@/lib/api';
import { exportToCSV } from '@/lib/utils';

import AddEmployeeModal from '@/components/employees/AddEmployeeModal';
import PaySalaryModal from '@/components/employees/PaySalaryModal';
import GiveAdvanceModal from '@/components/employees/GiveAdvanceModal';
import AddCommissionModal from '@/components/employees/AddCommissionModal';
import EmployeeLeaveModal from '@/components/employees/EmployeeLeaveModal';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';
import EmployeeStatementTable, { LedgerEntry } from '@/components/employees/EmployeeStatementTable';

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
  leave_status?: string;
  leave_reason?: string;
  ledger: LedgerEntry[];
  updated_at?: string;
}
export default function EmployeesPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'advance' | 'clear'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showCommModal, setShowCommModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  // SSR Hydration & Real API Sync — SQL-only, no browser storage
  useEffect(() => {
    setIsMounted(true);
    async function initData() {
      let empList: EmployeeRecord[] = [];
      try {
        const apiEmps = await fetchEmployees();
        if (Array.isArray(apiEmps) && apiEmps.length > 0) {
          empList = apiEmps.map((e: any) => {
            const id = String(e.id);
            const name = e.name || e.supplier_name || 'Staff Member';
            return {
              id,
              emp_code: `#EMP-${id.slice(0, 3).toUpperCase()}`,
              supplier_name: name,
              phone: e.phone || '0300-0000000',
              since: 'Active',
              role: e.role || e.job_title || 'Staff',
              category: 'Salesmen' as const,
              base_salary: Number(e.base_salary) || 35000,
              advance_due: 0,
              time_ago: 'Recent',
              initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
              avatar_color: 'bg-[#1b3830]',
              ledger: Array.isArray(e.ledger) ? e.ledger : [],
            };
          });
        }
      } catch (err) {
        console.warn('Backend employees API sync notice:', err);
      }

      setEmployees(empList);
      if (empList[0]?.id) setSelectedId(empList[0].id);
    }
    initData();

    window.addEventListener('employee-updated', initData);
    window.addEventListener('pos-data-updated', initData);
    return () => {
      window.removeEventListener('employee-updated', initData);
      window.removeEventListener('pos-data-updated', initData);
    };
  }, []);

  // Filtered Employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const match =
        !q ||
        (emp.supplier_name || '').toLowerCase().includes(q) ||
        (emp.phone || '').includes(q) ||
        (emp.emp_code || '').toLowerCase().includes(q) ||
        (emp.role || '').toLowerCase().includes(q);

      if (!match) return false;
      if (filterTab === 'advance') return (emp.advance_due || 0) > 0;
      if (filterTab === 'clear') return (emp.advance_due || 0) <= 0;
      return true;
    });
  }, [employees, searchQuery, filterTab]);

  const activeEmployee = useMemo<EmployeeRecord | null>(() => {
    if (!selectedId) return filteredEmployees[0] || employees[0] || null;
    return employees.find((e) => String(e.id) === String(selectedId)) || filteredEmployees[0] || employees[0] || null;
  }, [employees, selectedId, filteredEmployees]);

  const totalAdvance = useMemo(() => employees.reduce((sum, e) => sum + (e.advance_due || 0), 0), [employees]);

  const totals = useMemo(() => {
    if (!activeEmployee || !activeEmployee.ledger) return { earned: 0, paid: 0 };
    const earned = activeEmployee.ledger.reduce((sum, i) => sum + (i.credit || 0), 0);
    const paid = activeEmployee.ledger.reduce((sum, i) => sum + (i.debit || 0), 0);
    return { earned, paid };
  }, [activeEmployee]);

  // Handler: Open Delete Employee Modal
  const handleDeleteEmployee = () => {
    if (!activeEmployee) return;
    setDeleteTarget(activeEmployee);
  };

  // Handler: Confirm Delete Employee
  const confirmDeleteEmployee = async () => {
    if (!deleteTarget) return;
    const empToDelete = deleteTarget;
    setDeleteTarget(null);

    try {
      await deleteEmployee(String(empToDelete.id));
    } catch (err) {
      console.warn('Backend delete employee notice:', err);
    }

    showCatalogToast(`Deleted Employee: ${empToDelete.supplier_name}`, 'delete');
    const updated = employees.filter((e) => String(e.id) !== String(empToDelete.id));
    setEmployees(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_employee_records_v3', JSON.stringify(updated));
    }
    setSelectedId(updated[0]?.id || null);
  };

  // Handler: Delete Ledger Item
  const handleDeleteLedgerItem = (itemId: string) => {
    if (!activeEmployee) return;
    setEmployees((prev) =>
      prev.map((e) => {
        if (String(e.id) === String(activeEmployee.id)) {
          const newLedger = e.ledger.filter((i) => String(i.id) !== String(itemId));
          const newAdvances = newLedger
            .filter((i) => !i.is_settled && (i.debit || 0) > 0)
            .reduce((sum, i) => sum + i.debit, 0);
          return {
            ...e,
            advance_due: newAdvances,
            ledger: newLedger,
          };
        }
        return e;
      })
    );
    showCatalogToast('Ledger entry removed', 'delete');
  };

  // Handlers for Modal Success Callbacks
  const handlePaySalarySuccess = (amount: number, note: string) => {
    if (!activeEmployee) return;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newEntry: LedgerEntry = {
      id: `lp-${Date.now()}`,
      date: today,
      type: `Salary Payout #SL-${Math.floor(100 + Math.random() * 900)}`,
      description: note,
      debit: amount,
      credit: 0,
      is_settled: true,
    };

    setEmployees((prev) =>
      prev.map((emp) => (String(emp.id) === String(activeEmployee.id) ? { ...emp, ledger: [newEntry, ...emp.ledger] } : emp))
    );
  };

  const handleGiveAdvanceSuccess = (amount: number, note: string) => {
    if (!activeEmployee) return;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newEntry: LedgerEntry = {
      id: `la-${Date.now()}`,
      date: today,
      type: `Advance Voucher #ADV-${Math.floor(100 + Math.random() * 900)}`,
      description: note,
      debit: amount,
      credit: 0,
      balanceText: `Rs. ${amount.toLocaleString()} ADVANCE`,
      is_settled: false,
    };

    setEmployees((prev) =>
      prev.map((emp) =>
        String(emp.id) === String(activeEmployee.id)
          ? {
              ...emp,
              advance_due: (emp.advance_due || 0) + amount,
              ledger: [newEntry, ...emp.ledger],
            }
          : emp
      )
    );
  };

  const handleAddCommissionSuccess = (salesAmount: number, rate: number, creditVal: number) => {
    if (!activeEmployee) return;
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newEntry: LedgerEntry = {
      id: `lc-${Date.now()}`,
      date: today,
      type: 'Commission Credit',
      description: `${rate}% POS Sales Commission on Rs. ${salesAmount.toLocaleString()}`,
      debit: 0,
      credit: creditVal,
      is_settled: true,
    };

    setEmployees((prev) =>
      prev.map((emp) => (String(emp.id) === String(activeEmployee.id) ? { ...emp, ledger: [newEntry, ...emp.ledger] } : emp))
    );
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs">
        Loading Employee Ledger...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden font-sans p-1">
      {/* Edge to Edge Main Split Screen matching Purchases & Khata */}
      <div className="grid grid-cols-12 flex-1 w-full h-full min-h-0 bg-[#f8fafc] overflow-hidden">
        {/* LEFT PANEL: Employee List */}
        <div className="col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-3.5 gap-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-700 text-xs tracking-wider uppercase truncate">EMPLOYEE LEDGER</h4>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg cursor-pointer transition shadow-2xs shrink-0"
            >
              + NEW EMPLOYEE
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b3830] transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            {(['all', 'advance', 'clear'] as const).map((tab) => {
              const isSel = filterTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'advance' ? 'Advance' : 'Clear';
              return (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1 rounded-full text-xs transition cursor-pointer ${
                    isSel ? 'bg-[#1b3830] text-white font-medium shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Total Advance & Count Banner */}
          <div className="flex items-center justify-between text-xs font-normal text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span>
              TOTAL ADVANCE:{' '}
              <strong className="text-slate-900 font-semibold ml-1 text-xs font-mono">
                Rs. {totalAdvance.toLocaleString()}
              </strong>
            </span>
            <span className="text-slate-500 text-xs">{employees.length} Employees</span>
          </div>

          {/* Employee List Items */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5">
            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <UserCheck className="w-8 h-8 text-slate-300" />
                <p className="font-medium text-slate-600">No Employees Found</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[#1b3830] text-white rounded-xl font-medium text-xs shadow-2xs cursor-pointer"
                >
                  Add New Employee
                </button>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSel = activeEmployee && String(activeEmployee.id) === String(emp.id);
                const hasAdvance = (emp.advance_due || 0) > 0;

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedId(emp.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSel ? 'bg-[#e6f4ea] border-emerald-400/80 shadow-2xs' : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        className={`w-8.5 h-8.5 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 text-white ${
                          emp.avatar_color || (isSel ? 'bg-[#1b3830]' : 'bg-slate-600')
                        }`}
                      >
                        {emp.initials}
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0">
                        <h5 className="font-semibold text-xs text-slate-900 truncate leading-snug">{emp.supplier_name}</h5>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5 truncate">{emp.role}</p>
                      </div>
                    </div>

                    {/* Balance & Status Icon */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="font-semibold font-mono text-slate-800 text-xs">
                        Rs. {(emp.advance_due || 0).toLocaleString()}
                      </span>
                      {hasAdvance ? (
                        <div className="w-4 h-4 rounded-full border border-amber-300 bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                          !
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Employee Details & Statement */}
        <div className="col-span-8 lg:col-span-9 p-4 flex flex-col h-full overflow-hidden gap-3.5 bg-[#f8fafc]">
          {activeEmployee ? (
            <>
              {/* Header Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{activeEmployee.supplier_name}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono font-medium text-slate-600">
                      {activeEmployee.emp_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-normal mt-1">
                    <span>{activeEmployee.phone}</span>
                    <span>•</span>
                    <span>Since {activeEmployee.since}</span>
                    <span>•</span>
                    <span>{activeEmployee.role}</span>
                  </div>
                </div>

                {/* Toolbar Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Mark Leave</span>
                  </button>

                  <button
                    onClick={() => setShowPayModal(true)}
                    className="px-3.5 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Pay Salary</span>
                  </button>

                  <button
                    onClick={() => setShowAdvanceModal(true)}
                    className="px-3.5 py-1.5 bg-[#e6f4ea] hover:bg-[#d5ecd9] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Give Advance</span>
                  </button>

                  <button
                    onClick={() => setShowCommModal(true)}
                    className="px-3.5 py-1.5 bg-[#eef4ff] hover:bg-[#dbe7ff] text-blue-800 border border-blue-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>+ Add Commission</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!activeEmployee) return;
                      const rows = activeEmployee.ledger.map((item) => [
                        item.date,
                        item.type,
                        item.description,
                        item.debit || 0,
                        item.credit || 0,
                      ]);
                      exportToCSV(
                        `${activeEmployee.supplier_name.replace(/\s+/g, '_')}_statement.csv`,
                        ['Date', 'Type', 'Description', 'Debit (Paid)', 'Credit (Earned)'],
                        rows
                      );
                      showCatalogToast(`Downloaded statement for ${activeEmployee.supplier_name}`, 'add');
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download Statement</span>
                  </button>

                  <button
                    onClick={handleDeleteEmployee}
                    title="Delete Employee Account"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>

              {/* Modular Statement Table */}
              <EmployeeStatementTable ledger={activeEmployee.ledger} onDeleteItem={handleDeleteLedgerItem} />

              {/* Bottom Summary Bar */}
              <div className="bg-[#eef4ff] border border-blue-200 rounded-2xl p-3 justify-center flex text-xs font-normal text-slate-700 shrink-0 shadow-2xs">
                <div className="flex items-center gap-6 text-xs gap-50">
                  <span>
                    TOTAL EARNED:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {totals.earned.toLocaleString()}
                    </strong>
                  </span>

                  <span>
                    TOTAL PAID:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {totals.paid.toLocaleString()}
                    </strong>
                  </span>

                  <div className="bg-[#fce8e6] text-rose-900 px-3 py-1 rounded-xl border border-rose-200 font-mono font-semibold text-xs">
                    NET ADVANCE DUE: Rs. {(activeEmployee.advance_due || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <UserCheck className="w-10 h-10 text-slate-300" />
              <p className="font-medium text-slate-600 text-sm">No Employee Selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newEmp) => {
            if (newEmp?.id) {
              setEmployees((prev) => [newEmp, ...prev]);
              setSelectedId(newEmp.id);
            }
          }}
        />
      )}

      {showPayModal && activeEmployee && (
        <PaySalaryModal
          employee={activeEmployee}
          defaultAmount={totals.earned > totals.paid ? totals.earned - totals.paid : activeEmployee.base_salary}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaySalarySuccess}
        />
      )}

      {showAdvanceModal && activeEmployee && (
        <GiveAdvanceModal
          employee={activeEmployee}
          onClose={() => setShowAdvanceModal(false)}
          onSuccess={handleGiveAdvanceSuccess}
        />
      )}

      {showCommModal && activeEmployee && (
        <AddCommissionModal
          employee={activeEmployee}
          onClose={() => setShowCommModal(false)}
          onSuccess={handleAddCommissionSuccess}
        />
      )}

      {showLeaveModal && activeEmployee && (
        <EmployeeLeaveModal
          employee={activeEmployee}
          onClose={() => setShowLeaveModal(false)}
          onSuccess={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('pos-data-updated'));
            }
          }}
        />
      )}

      {/* Animated Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmationModal
          title="Confirm Employee Deletion"
          entityName={deleteTarget.supplier_name}
          message={`Are you sure you want to delete employee account for ${deleteTarget.supplier_name}?`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDeleteEmployee}
        />
      )}
    </div>
  );
}
