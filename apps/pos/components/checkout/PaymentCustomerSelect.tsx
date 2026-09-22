'use client';

import React from 'react';
import { Search, UserPlus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentCustomerSelectProps {
  customerSearch: string;
  setCustomerSearch: (v: string) => void;
  filteredKhatas: any[];
  selectedKhataCustomer: any | null;
  setSelectedKhataCustomer: (c: any) => void;
  showNewCustInput: boolean;
  setShowNewCustInput: (v: boolean) => void;
  newCustomerName: string;
  setNewCustomerName: (v: string) => void;
  newCustomerPhone: string;
  setNewCustomerPhone: (v: string) => void;
}

export default function PaymentCustomerSelect({
  customerSearch,
  setCustomerSearch,
  filteredKhatas,
  selectedKhataCustomer,
  setSelectedKhataCustomer,
  showNewCustInput,
  setShowNewCustInput,
  newCustomerName,
  setNewCustomerName,
  newCustomerPhone,
  setNewCustomerPhone,
}: PaymentCustomerSelectProps) {
  return (
    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">Khata Customer / Debt Account</label>
        <button
          onClick={() => setShowNewCustInput(!showNewCustInput)}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showNewCustInput ? 'Search Existing' : '+ New Customer'}</span>
        </button>
      </div>

      {showNewCustInput ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Customer Name"
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Phone (03xx-xxxxxxx)"
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
          />
        </div>
      ) : (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search Khata customer by name or phone..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
          />

          {customerSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-20 divide-y divide-slate-100">
              {filteredKhatas.length === 0 ? (
                <div className="p-2 text-center text-xs text-slate-400 font-bold">No customer found</div>
              ) : (
                filteredKhatas.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => {
                      setSelectedKhataCustomer(k);
                      setCustomerSearch('');
                    }}
                    className="p-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{k.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{k.phone}</div>
                    </div>
                    <span className="font-mono font-bold text-rose-600">
                      Balance: {formatCurrency(k.total_balance || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {selectedKhataCustomer && (
        <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex justify-between items-center text-xs font-bold text-indigo-900">
          <span>Selected: {selectedKhataCustomer.customer_name} ({selectedKhataCustomer.phone})</span>
          <button onClick={() => setSelectedKhataCustomer(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">Remove</button>
        </div>
      )}
    </div>
  );
}
