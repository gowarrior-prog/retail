'use client';

import React, { useState, useEffect } from 'react';
import { Search, Printer, Trash2, Plus, ShoppingBag, AlertCircle, CheckCircle2, UserCheck, FileText, UserPlus } from 'lucide-react';
import { fetchKhata, deleteKhataCustomer, getLocalKhataCache } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { showProfessionalAlert } from '@/lib/alert';
import { showCatalogToast } from '@/lib/toast';
import AddKhataModal from '@/components/khata/AddKhataModal';
import ReceivePaymentModal from '@/components/khata/ReceivePaymentModal';
import AddBillModal from '@/components/khata/AddBillModal';

export default function KhataPage() {
  const [khataRecords, setKhataRecords] = useState<any[]>(() => getLocalKhataCache());
  const [isLoading, setIsLoading] = useState<boolean>(() => getLocalKhataCache().length === 0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [showAddBillModal, setShowAddBillModal] = useState<boolean>(false);

  const loadKhata = async () => {
    try {
      const data = await fetchKhata();
      if (Array.isArray(data)) {
        setKhataRecords(data);
        if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Khata load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadKhata(); }, []);

  const filteredClients = khataRecords.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (c.customer_name || c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  const activeClient = khataRecords.find((c: any) => String(c.id) === String(selectedId)) || filteredClients[0] || null;
  const totalOutstanding = khataRecords.reduce((sum, c) => sum + (c.total_balance > 0 ? c.total_balance : 0), 0);

  const handleDeleteClient = async () => {
    if (!activeClient) return;
    try {
      await deleteKhataCustomer(activeClient.id);
      showCatalogToast(`Deleted Khata account: ${activeClient.customer_name || activeClient.name}`, 'delete');
      setSelectedId(null);
      await loadKhata();
    } catch (err: any) {
      showProfessionalAlert(err.message || 'Error deleting client', 'Khata Notice');
    }
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-65px)] overflow-hidden font-sans -m-4 sm:-m-6">
      {/* Edge to Edge Grid Layout */}
      <div className="grid grid-cols-12 flex-1 w-full h-full min-h-0 bg-[#f8fafc] overflow-hidden">
        {/* Left Column: Client List */}
        <div className="col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-4 gap-3.5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase font-mono truncate">CUSTOMER KHATA</h4>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-[#1b3830] hover:bg-[#142e27] text-white text-[11px] font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> <span>+ NEW CLIENT</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client by name or phone..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-[#f0f5ff] p-3 rounded-xl border border-blue-100">
            <span>TOTAL DUE: <strong className="text-slate-900 font-mono text-sm">{formatCurrency(totalOutstanding)}</strong></span>
            <span className="text-slate-500 font-mono">{khataRecords.length} Clients</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 min-h-0 pr-1">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading Khata accounts...</div>
            ) : filteredClients.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs flex flex-col items-center gap-2.5">
                <UserCheck className="w-10 h-10 text-slate-300" />
                <p className="font-bold text-slate-700">No Khata Accounts Found</p>
                <button onClick={() => setShowAddModal(true)} className="mt-1 px-4 py-2 bg-[#1b3830] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                  + Add New Khata Client
                </button>
              </div>
            ) : (
              filteredClients.map((c: any, idx: number) => {
                const isSel = activeClient && (String(activeClient.id) === String(c.id));
                const custName = c.customer_name || c.name || 'Khata Customer';
                const initials = custName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const isDue = (c.total_balance || 0) > 0;

                return (
                  <div
                    key={c.id || idx}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSel ? 'bg-[#e6f4ea] border-emerald-400 shadow-2xs' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        isSel ? 'bg-emerald-800 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">{custName}</h5>
                        <p className="text-[10.5px] text-slate-500 font-medium mt-0.5">{c.phone || '0300-0000000'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-xs">{formatCurrency(c.total_balance || 0)}</span>
                      {isDue ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ledger Statement Detail View */}
        <div className="col-span-8 lg:col-span-9 p-5 flex flex-col h-full overflow-hidden gap-4 bg-[#f8fafc]">
          {activeClient ? (
            <>
              {/* Header Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">{activeClient.customer_name || activeClient.name}</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    📞 {activeClient.phone || '0300-0000000'} &nbsp;•&nbsp; 
                    📅 Created: {activeClient.updated_at ? new Date(activeClient.updated_at).toLocaleDateString('en-GB') : 'Active'} &nbsp;•&nbsp; 
                    🛍️ Real Khata Ledger Account
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setShowReceiveModal(true)} className="px-4 py-2 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <Plus className="w-4 h-4 text-rose-700" /> <span>Receive Payment</span>
                  </button>
                  <button onClick={() => setShowAddBillModal(true)} className="px-4 py-2 bg-[#e6f4ea] hover:bg-[#d5ecd9] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" /> <span>Add Bill</span>
                  </button>
                  <button onClick={() => window.print()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <FileText className="w-4 h-4 text-slate-600" /> <span>Download PDF</span>
                  </button>
                  <button onClick={() => window.print()} title="Print Ledger" className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs transition cursor-pointer">
                    <Printer className="w-4.5 h-4.5" />
                  </button>
                  <button onClick={handleDeleteClient} title="Delete Client" className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs transition cursor-pointer">
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Table Statement */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
                <div className="p-3.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 uppercase tracking-wider font-mono flex justify-between">
                  <span>Khata Ledger Statement</span>
                  <span className="text-slate-500 font-mono">Account ID: {activeClient.id}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase font-mono text-slate-600">
                        <th className="p-3 font-bold">DATE</th>
                        <th className="p-3 font-bold">DESCRIPTION / REFERENCE</th>
                        <th className="p-3 font-bold text-right">DEBIT (DUE)</th>
                        <th className="p-3 font-bold text-right">CREDIT (JAMA)</th>
                        <th className="p-3 font-bold text-right">BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-600">{activeClient.updated_at ? new Date(activeClient.updated_at).toLocaleDateString('en-GB') : 'Active'}</td>
                        <td className="p-3"><span className="font-bold text-slate-900">Current Balance / Khata Record</span> <span className="ml-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">Account</span></td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(activeClient.total_balance || 0)}</td>
                        <td className="p-3 text-right font-mono text-slate-400">—</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(activeClient.total_balance || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Totals Banner */}
              <div className="bg-[#e8f0fe] border border-blue-200 rounded-2xl p-4 flex justify-between items-center text-xs font-bold text-slate-800 shrink-0 shadow-2xs">
                <span className="font-bold text-blue-900 text-sm font-sans">Cumulative Account Statement Totals</span>
                <div className="flex items-center gap-8 text-xs">
                  <span>TOTAL BILLED / DEBIT: <strong className="font-mono text-slate-900 text-sm">{formatCurrency(activeClient.total_balance || 0)}</strong></span>
                  <span>TOTAL RECEIVED / CREDIT: <strong className="font-mono text-emerald-800 text-sm">Rs. 0</strong></span>
                  <span className="bg-[#fce8e6] text-rose-900 px-3.5 py-1.5 rounded-xl border border-rose-200 font-mono font-black text-sm">NET BALANCE DUE: {formatCurrency(activeClient.total_balance || 0)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <UserCheck className="w-12 h-12 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">No Khata Account Selected</p>
              <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-[#1b3830] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer">
                + Add New Khata Client
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddKhataModal onClose={() => setShowAddModal(false)} onSuccess={(newCust) => { loadKhata(); if (newCust?.id) setSelectedId(newCust.id); }} />}
      {showReceiveModal && activeClient && <ReceivePaymentModal client={activeClient} onClose={() => setShowReceiveModal(false)} onSuccess={loadKhata} />}
      {showAddBillModal && activeClient && <AddBillModal client={activeClient} onClose={() => setShowAddBillModal(false)} onSuccess={loadKhata} />}
    </div>
  );
}
