'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, X, User, Trash2, UserCheck, Shield } from 'lucide-react';
import { fetchEmployees, createEmployee, deleteEmployee, syncOdooEmployees, getLocalEmployeesCache } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>(() => getLocalEmployeesCache());
  const [isLoading, setIsLoading] = useState<boolean>(() => getLocalEmployeesCache().length === 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'ADMIN',
    phone: '',
    salary: '',
  });

  const loadData = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch staff members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncStaff = async () => {
    setIsSyncing(true);
    try {
      await syncOdooEmployees();
      await loadData();
    } catch (err) {
      console.error('Failed to sync Odoo Staff:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newEmployee.name,
      role: newEmployee.role,
      phone: newEmployee.phone || `0301-${Math.floor(1000000 + Math.random() * 9000000)}`,
      base_salary: parseFloat(newEmployee.salary) || 35000,
    };

    try {
      const created = await createEmployee(payload);
      setEmployees((prev) => [created, ...prev]);
    } catch (err: any) {
      alert(`Failed to create staff member: ${err.message}`);
    }

    setIsAddModalOpen(false);
    setNewEmployee({ name: '', role: 'ADMIN', phone: '', salary: '' });
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await deleteEmployee(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(`Failed to delete staff member: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <Users className="w-5.5 h-5.5 text-indigo-600" />
            Employees & Staff Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage store employees, salaries, and cashier permissions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncStaff}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-indigo-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing Staff...' : 'Sync Odoo Staff'}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <RefreshCw className={cn('w-4 h-4 text-slate-600', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Active Staff</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{employees.length}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Payroll</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
              {formatCurrency(employees.reduce((sum, e) => sum + (e.base_salary || 0), 0))}
            </span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Role</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">Admin & Cashier</span>
          </div>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">Staff Roster ({employees.length} Members)</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">Loading staff records...</div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">
            No employees registered yet. Click "Add Staff Member" to add team members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Role / Designation</th>
                  <th className="p-3">Phone Number</th>
                  <th className="p-3 text-right">Monthly Salary</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {employees.map((emp, idx) => (
                  <tr key={emp.id || `emp-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 flex items-center gap-2.5 font-bold text-slate-900">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <span className="font-sans font-bold">{emp.name}</span>
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{emp.role || 'Staff'}</td>
                    <td className="p-3">{emp.phone || '0301-0000000'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(emp.base_salary || 35000)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                        Active
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                        title="Remove Employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm font-sans">Add Staff Member</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="flex flex-col gap-3.5 mt-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1 font-sans">Employee Full Name</label>
                <input
                  required
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-medium"
                  placeholder="e.g. Tariq Ahmed"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Role</label>
                  <select
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-medium"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="CASHIER">CASHIER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1 font-sans">Phone Number</label>
                  <input
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                    placeholder="0301-0000000"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 font-sans">Monthly Salary (PKR)</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all font-mono"
                  placeholder="35000"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-xs"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
