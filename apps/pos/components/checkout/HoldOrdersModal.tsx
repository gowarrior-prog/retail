'use client';

import React, { useState, useEffect } from 'react';
import { X, Search, RefreshCw, Lock, Maximize2, Printer, Trash2, Plus, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { formatCurrency } from '@/lib/utils';

export default function HoldOrdersModal({ onClose }: { onClose: () => void }) {
  const { heldBills, restoreHeldOrder, deleteHeldOrder } = useCartStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(heldBills[0]?.id || null);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  const sampleOrders: any[] = heldBills.length > 0 ? heldBills : [
    { id: 'ORD-118', timestamp: '3 days ago', total: 38400, items: [{ name: 'Master Tariq Tailors', quantity: 2, price: 19200 }], customer: 'Master Tariq Tailors', phone: '0300-8151290' },
    { id: 'ORD-115', timestamp: '5 days ago', total: 4500, items: [{ name: 'Chaudhry Aslam & Sons', quantity: 1, price: 4500 }], customer: 'Chaudhry Aslam & Sons', phone: '0301-4455667' },
    { id: 'ORD-109', timestamp: '1 week ago', total: 21700, items: [{ name: 'Mian Imran Silk House', quantity: 3, price: 7233 }], customer: 'Mian Imran Silk House', phone: '0321-9988776' },
  ];

  const currentSelection: any = sampleOrders.find((h: any) => h.id === selectedId) || sampleOrders[0] || {};

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-6 opacity-0'
        }`}
      >
        {/* Top Header Bar */}
        <div className="p-3.5 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 flex items-center justify-center text-white font-bold text-xs">
              🛍️
            </div>
            <h3 className="font-extrabold text-sm tracking-wide">BILAL CLOTH & SILK CENTER — HELD ORDERS & KHATA</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition"><RefreshCw className="w-4 h-4" /></button>
            <button className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition"><Lock className="w-4 h-4" /></button>
            <button className="p-1.5 text-emerald-200 hover:text-white rounded-lg transition"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={handleAnimatedClose} className="p-1.5 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-12 flex-1 min-h-0 bg-[#f8fafc]">
          {/* Left Column: Orders List */}
          <div className="col-span-4 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-3.5 gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs tracking-wider uppercase font-mono">CUSTOMER KHATA / HELD</h4>
              <button className="px-2.5 py-1 bg-[#1b3830] hover:bg-[#142e27] text-white text-[10.5px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition">
                <Plus className="w-3 h-3" /> <span>NEW CLIENT</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client by name or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b3830]"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <span>TOTAL DUE: <strong className="text-slate-900 font-mono">Rs. 148,200</strong></span>
              <span className="text-slate-500 font-mono">{sampleOrders.length} Clients</span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
              {sampleOrders.map((ord: any, idx: number) => {
                const isSel = (currentSelection?.id === ord.id);
                const custName = ord.customer || ord.id;
                const initials = custName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div
                    key={ord.id}
                    onClick={() => setSelectedId(ord.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSel
                        ? 'bg-[#e6f4ea] border-emerald-400 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        idx === 0 ? 'bg-emerald-800 text-white' : idx === 1 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-slate-900 truncate">{custName}</h5>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{ord.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-900 text-xs">{formatCurrency(ord.total)}</span>
                      {idx % 2 === 0 ? <AlertCircle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Statement & Detail View */}
          <div className="col-span-8 p-4 flex flex-col h-full overflow-hidden gap-3.5">
            {/* Header Detail Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{currentSelection?.customer || currentSelection?.id || 'Master Tariq Tailors'}</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">📞 0300-8151290 &nbsp;•&nbsp; 📅 Since Mar 2021 &nbsp;•&nbsp; 🛍️ 24 Total Orders</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer">+ Receive Payment</button>
                {currentSelection?.id && (
                  <button
                    onClick={() => {
                      restoreHeldOrder(currentSelection.id);
                      handleAnimatedClose();
                    }}
                    className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> <span>Add Bill / Resume</span>
                  </button>
                )}
                <button className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs transition cursor-pointer"><Printer className="w-4 h-4" /></button>
                {currentSelection?.id && (
                  <button
                    onClick={() => deleteHeldOrder(currentSelection.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Table Statement */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="p-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">
                Khata Ledger Statement
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 text-[10.5px] uppercase font-mono text-slate-600">
                      <th className="p-2.5 font-bold">DATE</th>
                      <th className="p-2.5 font-bold">DESCRIPTION / REFERENCE</th>
                      <th className="p-2.5 font-bold text-right">DEBIT (DUE)</th>
                      <th className="p-2.5 font-bold text-right">CREDIT (JAMA)</th>
                      <th className="p-2.5 font-bold text-right">BALANCE</th>
                      <th className="p-2.5 font-bold text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-600">18 Oct 2023</td>
                      <td className="p-2.5"><span className="font-bold text-slate-900">Order #ORD-118</span> <span className="ml-1.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9.5px] font-bold rounded">Invoice</span></td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">Rs. 18,500</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">—</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">Rs. 12,500 <span className="text-[9.5px] text-rose-600 font-bold block">DUE</span></td>
                      <td className="p-2.5 text-center"><button className="text-slate-400 hover:text-slate-700"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button></td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-slate-600">04 Oct 2023</td>
                      <td className="p-2.5 font-bold text-slate-900">Cash Payment</td>
                      <td className="p-2.5 text-right font-mono text-slate-400">—</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-700">Rs. 6,000</td>
                      <td className="p-2.5 text-right"><CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" /></td>
                      <td className="p-2.5 text-center"><button className="text-slate-400 hover:text-slate-700"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Cumulative Statement Totals Banner */}
            <div className="bg-[#e8f0fe] border border-blue-200 rounded-xl p-3 flex justify-between items-center text-xs font-bold text-slate-800 shrink-0">
              <span className="font-bold text-blue-900 font-sans">Cumulative Account Statement Totals</span>
              <div className="flex items-center gap-6">
                <span>TOTAL BILLED: <strong className="font-mono text-slate-900">Rs. 44,500</strong></span>
                <span>TOTAL RECEIVED: <strong className="font-mono text-emerald-800">Rs. 32,000</strong></span>
                <span className="bg-[#fce8e6] text-rose-900 px-3 py-1 rounded-lg border border-rose-200 font-mono font-black">NET BALANCE DUE: Rs. 12,500</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
