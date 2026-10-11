'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, Users, RotateCcw, Package, AlertCircle } from 'lucide-react';

interface AnalyticalReportsTableProps {
  activeTab?: 'inventory' | 'salesmen' | 'customers' | 'returns';
  onTabChange?: (tab: 'inventory' | 'salesmen' | 'customers' | 'returns') => void;
  products?: any[];
  billingRecords?: any[];
  employees?: any[];
  khataCustomers?: any[];
  customerReturns?: any[];
  supplierReturns?: any[];
}

export default function AnalyticalReportsTable({
  activeTab: externalActiveTab,
  onTabChange,
  products = [],
  billingRecords = [],
  employees = [],
  khataCustomers = [],
  customerReturns = [],
  supplierReturns = [],
}: AnalyticalReportsTableProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<'inventory' | 'salesmen' | 'customers' | 'returns'>('inventory');

  const activeTab = externalActiveTab || internalActiveTab;

  const handleTabClick = (tab: 'inventory' | 'salesmen' | 'customers' | 'returns') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  // 1. Inventory stock analysis
  const inventoryAnalytics = useMemo(() => {
    return products.slice(0, 10).map((p) => {
      const stock = Number(p.stock ?? p.quantity ?? 0);
      const price = Number(p.price || 0);
      return {
        id: p.id,
        name: p.name,
        category: p.category || 'General',
        stock,
        price,
        valuation: stock * price,
        status: stock <= 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'Healthy',
      };
    });
  }, [products]);

  // 2. Salesman performance
  const salesmanAnalytics = useMemo(() => {
    const map = new Map<string, { name: string; salesCount: number; totalAmount: number }>();
    
    // Seed from employees list
    employees.forEach((e) => {
      map.set(e.name, { name: e.name, salesCount: 0, totalAmount: 0 });
    });

    billingRecords.forEach((b) => {
      const cashier = b.cashier_name || 'Admin Cashier';
      if (!map.has(cashier)) {
        map.set(cashier, { name: cashier, salesCount: 0, totalAmount: 0 });
      }
      const item = map.get(cashier)!;
      item.salesCount += 1;
      item.totalAmount += Number(b.total_amount || b.grand_total || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [employees, billingRecords]);

  // 3. Customer loyalty & Khata
  const customerAnalytics = useMemo(() => {
    return khataCustomers.slice(0, 10).map((c) => ({
      id: c.id,
      name: c.name || c.customer_name || 'Retail Customer',
      phone: c.phone || 'N/A',
      balance: Number(c.balance || c.total_balance || 0),
      status: Number(c.balance || c.total_balance || 0) > 0 ? 'Active Due' : 'Cleared',
    }));
  }, [khataCustomers]);

  // 4. Returns & claims
  const allReturns = useMemo(() => {
    const list: any[] = [];
    customerReturns.forEach((cr) => {
      list.push({
        id: cr.id,
        code: cr.return_code || 'RET-001',
        party: cr.customer_name || 'Customer',
        phone: cr.customer_phone || '-',
        type: 'Customer Return',
        amount: Number(cr.total_value || 0),
        status: cr.status || 'Completed',
        date: cr.created_at ? new Date(cr.created_at).toLocaleDateString() : 'Recent',
      });
    });
    supplierReturns.forEach((sr) => {
      list.push({
        id: sr.id,
        code: sr.return_code || 'SRET-001',
        party: sr.supplier_name || 'Supplier',
        phone: sr.purchase_bill || '-',
        type: 'Supplier Return',
        amount: Number(sr.total_value || 0),
        status: sr.status || 'Completed',
        date: sr.created_at ? new Date(sr.created_at).toLocaleDateString() : 'Recent',
      });
    });
    return list;
  }, [customerReturns, supplierReturns]);

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden font-sans">
      {/* Tab Controls Bar */}
      <div className="border-b border-slate-200 bg-slate-50/60 px-5 pt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex space-x-2 -mb-px overflow-x-auto text-xs font-bold font-sans">
          <button
            type="button"
            onClick={() => handleTabClick('inventory')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'inventory'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Fast-Moving vs Dead Stock</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold font-mono">
              {products.length} items
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('salesmen')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'salesmen'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Salesman Performance</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {salesmanAnalytics.length} staff
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('customers')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'customers'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>Client Retention & Khata</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {khataCustomers.length} clients
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabClick('returns')}
            className={`px-4 py-2.5 border-b-2 rounded-t-xl transition cursor-pointer flex items-center space-x-2 ${
              activeTab === 'returns'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <span>Returns & Claims</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {allReturns.length} records
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: Inventory Stock Velocity */}
      {activeTab === 'inventory' && (
        <div className="overflow-x-auto">
          {inventoryAnalytics.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4">Retail Unit Price</th>
                  <th className="py-3 px-4">Stock Valuation</th>
                  <th className="py-3 px-4">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryAnalytics.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{item.stock}</td>
                    <td className="py-3 px-4 font-mono">Rs. {item.price.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">Rs. {item.valuation.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Out of Stock'
                            ? 'bg-red-100 text-red-700'
                            : item.status === 'Low Stock'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No inventory stock velocity recorded yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Salesman Leaderboard */}
      {activeTab === 'salesmen' && (
        <div className="overflow-x-auto">
          {salesmanAnalytics.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Salesman / Cashier</th>
                  <th className="py-3 px-4">Invoices Completed</th>
                  <th className="py-3 px-4">Total Revenue Generated</th>
                  <th className="py-3 px-4">Performance Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesmanAnalytics.map((staff, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{staff.name}</td>
                    <td className="py-3 px-4 font-mono">{staff.salesCount} bills</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      Rs. {staff.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {idx === 0 ? 'Top Performer' : 'Active Counter'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No salesman counter transactions recorded yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Client Retention & Khata */}
      {activeTab === 'customers' && (
        <div className="overflow-x-auto">
          {customerAnalytics.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Outstanding Udhar Balance</th>
                  <th className="py-3 px-4">Khata Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerAnalytics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{c.phone}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      Rs. {c.balance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'Active Due'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No client repeat purchase data recorded yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Returns & Claims */}
      {activeTab === 'returns' && (
        <div className="overflow-x-auto">
          {allReturns.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Return Slip</th>
                  <th className="py-3 px-4">Customer / Supplier</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Refund / Claim Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.party}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.type === 'Customer Return'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      Rs. {r.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No return slips or claims recorded yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
