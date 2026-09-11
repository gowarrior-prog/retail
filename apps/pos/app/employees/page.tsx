'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, RefreshCw, X, User } from 'lucide-react';
import { fetchEmployees } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    role: 'Cashier',
    phone: '',
    salary: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error('Failed to fetch DB2 employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = {
      id: `emp-${Date.now().toString().slice(-4)}`,
      name: newEmployee.name,
      role: newEmployee.role,
      phone: newEmployee.phone || '0301-0000000',
      monthly_salary: parseFloat(newEmployee.salary) || 35000,
      status: 'Active',
    };
    setEmployees((prev) => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewEmployee({ name: '', role: 'Cashier', phone: '', salary: '' });
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Employees & Staff Operations (DB2)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Staff Directory and Shift Management for Narowal Store
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff Member</span>
          </button>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Employee List Table (Clean minimal design, zero dummy images) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">Staff Roster ({employees.length} Members)</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-mono">Loading staff records...</div>
        ) : employees.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No employees registered in DB2 Operations database yet.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="p-3 flex items-center gap-2 font-bold text-slate-900">
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-mono text-xs">
                        {emp.name ? emp.name.charAt(0).toUpperCase() : 'E'}
                      </div>
                      <span>{emp.name}</span>
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-800">{emp.role || 'Staff'}</td>
                    <td className="p-3">{emp.phone || '0301-0000000'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(emp.monthly_salary || 35000)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                        Active
                      </span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Add Staff Member</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="flex flex-col gap-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Employee Full Name</label>
                <input
                  required
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                  placeholder="e.g. Tariq Ahmed"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Role</label>
                  <select
                    className="w-full h-8 px-2 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="Inventory Handler">Inventory Handler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone Number</label>
                  <input
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    placeholder="0301-0000000"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Monthly Salary (PKR)</label>
                <input
                  type="number"
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  placeholder="35000"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
