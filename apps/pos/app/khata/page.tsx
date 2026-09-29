'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Printer,
  Trash2,
  Plus,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  FileText,
  UserPlus,
  SlidersHorizontal,
  Phone,
  Calendar,
  Download,
  Check,
  BookOpen,
} from 'lucide-react';
import { fetchKhata, deleteKhataCustomer, clearAllKhataRecords } from '@/lib/api';
import { showProfessionalAlert } from '@/lib/alert';
import { showCatalogToast } from '@/lib/toast';
import AddKhataModal from '@/components/khata/AddKhataModal';
import ReceivePaymentModal from '@/components/khata/ReceivePaymentModal';
import AddBillModal from '@/components/khata/AddBillModal';

interface LedgerItem {
  id: string;
  date: string;
  description: string;
  type: 'Invoice' | 'Payment';
  debit: number;
  credit: number;
  balanceText?: string;
  is_due?: boolean;
}

interface KhataClient {
  id: string;
  customer_name: string;
  phone: string;
  since?: string;
  total_orders?: number;
  total_balance: number;
  time_ago?: string;
  initials?: string;
  avatar_color?: string;
  ledger: LedgerItem[];
  updated_at?: string;
}

// Helper to deduplicate clients by ID or Name+Phone
function deduplicateClients(clients: KhataClient[]): KhataClient[] {
  const map = new Map<string, KhataClient>();
  for (const c of clients) {
    const nameKey = (c.customer_name || '').toLowerCase().trim();
    const phoneKey = (c.phone || '').trim();
    const dedupeKey = phoneKey && phoneKey !== '0300-0000000' ? `phone:${phoneKey}` : nameKey ? `name:${nameKey}` : c.id;

    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, { ...c, ledger: c.ledger || [] });
    } else {
      const existing = map.get(dedupeKey);
      if (existing) {
        const combinedLedger = [...(existing.ledger || []), ...(c.ledger || [])];
        const ledgerMap = new Map<string, LedgerItem>();
        combinedLedger.forEach((item) => ledgerMap.set(item.id, item));
        existing.ledger = Array.from(ledgerMap.values());
        if (typeof c.total_balance === 'number') {
          existing.total_balance = c.total_balance;
        }
      }
    }
  }
  return Array.from(map.values());
}

export default function KhataPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [khataRecords, setKhataRecords] = useState<KhataClient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'due' | 'advance'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [showAddBillModal, setShowAddBillModal] = useState<boolean>(false);

  // Mount effect to prevent Next.js SSR Hydration errors
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pos_khata_records_v4');
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const clean = deduplicateClients(parsed);
            setKhataRecords(clean);
            if (clean.length > 0 && clean[0]?.id) setSelectedId(clean[0].id);
            return;
          }
        } catch {}
      }
      setKhataRecords([]);
    }
  }, []);

  // Save to localStorage whenever khataRecords changes
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('pos_khata_records_v4', JSON.stringify(khataRecords));
    }
  }, [khataRecords, isMounted]);

  // Load from backend API if available and merge cleanly without duplicates
  useEffect(() => {
    if (!isMounted) return;
    async function loadApiKhata() {
      try {
        const data = await fetchKhata();
        if (Array.isArray(data) && data.length > 0) {
          setKhataRecords((prev) => {
            const existingMap = new Map<string, KhataClient>();
            prev.forEach((item) => {
              const k = (item.customer_name || '').toLowerCase().trim();
              if (k) existingMap.set(k, item);
            });

            const newFromApi: KhataClient[] = [];
            data.forEach((apiItem: any) => {
              const custName = apiItem.customer_name || apiItem.name || 'Khata Client';
              const k = custName.toLowerCase().trim();
              if (!existingMap.has(k)) {
                const id = String(apiItem.id || `khata-api-${Date.now()}`);
                const initials = custName
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                const bal = Number(apiItem.total_balance || apiItem.balance || 0);

                newFromApi.push({
                  id,
                  customer_name: custName,
                  phone: apiItem.phone || '0300-0000000',
                  since: 'Active',
                  total_orders: 1,
                  total_balance: bal,
                  time_ago: 'Recent',
                  initials,
                  avatar_color: 'bg-[#1b3830]',
                  ledger:
                    bal > 0
                      ? [
                          {
                            id: `leg-api-${id}`,
                            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                            description: 'Opening Balance',
                            type: 'Invoice',
                            debit: bal,
                            credit: 0,
                            balanceText: `Rs. ${bal.toLocaleString()} DUE`,
                            is_due: true,
                          },
                        ]
                      : [],
                });
              }
            });

            return deduplicateClients([...prev, ...newFromApi]);
          });
        }
      } catch (err) {
        console.error('Khata backend sync notice:', err);
      }
    }
    loadApiKhata();
  }, [isMounted]);

  // Filter clients based on search query and filter tabs
  const filteredClients = useMemo(() => {
    return khataRecords.filter((client) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (client.customer_name || '').toLowerCase().includes(q) ||
        (client.phone || '').includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'due') return (client.total_balance || 0) > 0;
      if (filterTab === 'advance') return (client.total_balance || 0) <= 0;
      return true;
    });
  }, [khataRecords, searchQuery, filterTab]);

  const activeClient = useMemo(() => {
    if (!selectedId) return filteredClients[0] || khataRecords[0] || null;
    return (
      khataRecords.find((c) => String(c.id) === String(selectedId)) ||
      filteredClients[0] ||
      khataRecords[0] ||
      null
    );
  }, [khataRecords, selectedId, filteredClients]);

  // Total Outstanding across all clients
  const totalOutstanding = useMemo(() => {
    return khataRecords.reduce((sum, c) => sum + (c.total_balance > 0 ? c.total_balance : 0), 0);
  }, [khataRecords]);

  // Calculations for active client's ledger statement
  const activeClientTotals = useMemo(() => {
    if (!activeClient || !activeClient.ledger) {
      return { totalBilled: 0, totalReceived: 0, netBalance: 0 };
    }
    const totalBilled = activeClient.ledger.reduce((sum, item) => sum + (item.debit || 0), 0);
    const totalReceived = activeClient.ledger.reduce((sum, item) => sum + (item.credit || 0), 0);
    const netBalance = totalBilled - totalReceived;
    return { totalBilled, totalReceived, netBalance };
  }, [activeClient]);

  // Handle Single Client Deletion
  const handleDeleteClient = async () => {
    if (!activeClient) return;
    if (!confirm(`Are you sure you want to delete Khata account for ${activeClient.customer_name}?`)) return;

    try {
      await deleteKhataCustomer(activeClient.id).catch(() => {});
      showCatalogToast(`Deleted Khata account: ${activeClient.customer_name}`, 'delete');
      const updated = khataRecords.filter((c) => String(c.id) !== String(activeClient.id));
      setKhataRecords(updated);
      setSelectedId(updated[0]?.id || null);
    } catch (err: any) {
      showProfessionalAlert(err.message || 'Error deleting client', 'Khata Notice');
    }
  };

  // Handle Ledger Item Deletion for Active Client ONLY
  const handleDeleteLedgerItem = (itemId: string) => {
    if (!activeClient) return;
    setKhataRecords((prev) =>
      prev.map((c) => {
        if (String(c.id) === String(activeClient.id)) {
          const newLedger = c.ledger.filter((item) => String(item.id) !== String(itemId));
          const newBilled = newLedger.reduce((sum, i) => sum + (i.debit || 0), 0);
          const newReceived = newLedger.reduce((sum, i) => sum + (i.credit || 0), 0);
          return {
            ...c,
            ledger: newLedger,
            total_balance: Math.max(0, newBilled - newReceived),
          };
        }
        return c;
      })
    );
    showCatalogToast('Ledger entry removed', 'delete');
  };

  // Add Payment Callback: Clears dues on existing invoice entries instead of adding extra rows!
  const handlePaymentSuccess = (info?: any) => {
    if (!activeClient) return;
    let paymentAmount = Number(info?.amount || 0);
    if (paymentAmount <= 0) return;

    setKhataRecords((prev) =>
      prev.map((c) => {
        if (String(c.id) === String(activeClient.id)) {
          const currentLedger = [...(c.ledger || [])];
          let remainingPayment = paymentAmount;
          let hasUpdatedExisting = false;

          // 1. Mark existing due invoice entries as paid in place
          const updatedLedger = currentLedger.map((item) => {
            if (remainingPayment > 0 && item.is_due) {
              hasUpdatedExisting = true;
              const itemDue = Math.max(0, item.debit - (item.credit || 0));
              if (remainingPayment >= itemDue) {
                remainingPayment -= itemDue;
                return {
                  ...item,
                  credit: item.debit,
                  is_due: false,
                  balanceText: undefined,
                };
              } else {
                const newCredit = (item.credit || 0) + remainingPayment;
                const rem = item.debit - newCredit;
                remainingPayment = 0;
                return {
                  ...item,
                  credit: newCredit,
                  balanceText: `Rs. ${rem.toLocaleString()} DUE`,
                  is_due: true,
                };
              }
            }
            return item;
          });

          // 2. If no existing due items were found or payment exceeded dues, add leftover payment record
          if (!hasUpdatedExisting && remainingPayment > 0) {
            const methodText = info?.method === 'BANK' ? 'Bank Transfer' : info?.method === 'DIGITAL' ? 'Digital Payment' : 'Cash Payment';
            const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            updatedLedger.unshift({
              id: `leg-pay-${Date.now()}`,
              date: todayStr,
              description: info?.note ? `${methodText} (${info.note})` : methodText,
              type: 'Payment',
              debit: 0,
              credit: remainingPayment,
              is_due: false,
            });
          }

          const newBilled = updatedLedger.reduce((sum, i) => sum + (i.debit || 0), 0);
          const newReceived = updatedLedger.reduce((sum, i) => sum + (i.credit || 0), 0);
          const netBal = Math.max(0, newBilled - newReceived);

          return {
            ...c,
            ledger: updatedLedger,
            total_balance: netBal,
            time_ago: 'Just now',
          };
        }
        return c;
      })
    );
  };

  // Add Bill Callback: UPDATES ACTIVE CLIENT ONLY
  const handleAddBillSuccess = (info?: any) => {
    if (!activeClient) return;
    const billAmount = Number(info?.amount || 0);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const invNum = `Order #ORD-${Math.floor(100 + Math.random() * 900)}`;

    setKhataRecords((prev) =>
      prev.map((c) => {
        if (String(c.id) === String(activeClient.id)) {
          const newLedgerItem: LedgerItem = {
            id: `leg-bill-${Date.now()}`,
            date: todayStr,
            description: invNum,
            type: 'Invoice',
            debit: billAmount,
            credit: 0,
            balanceText: `Rs. ${billAmount.toLocaleString()} DUE`,
            is_due: true,
          };
          const updatedLedger = [newLedgerItem, ...(c.ledger || [])];
          const newBilled = updatedLedger.reduce((sum, i) => sum + (i.debit || 0), 0);
          const newReceived = updatedLedger.reduce((sum, i) => sum + (i.credit || 0), 0);
          return {
            ...c,
            ledger: updatedLedger,
            total_balance: Math.max(0, newBilled - newReceived),
            time_ago: 'Just now',
          };
        }
        return c;
      })
    );
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden font-sans p-1">
      {/* Edge to Edge Main Split Screen */}
      <div className="grid grid-cols-12 flex-1 w-full h-full min-h-0 bg-[#f8fafc] overflow-hidden">
        
        {/* LEFT PANEL: Client Search & Khata Accounts List */}
        <div className="col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-3.5 gap-3">
          
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-700 text-xs tracking-wider uppercase truncate">
              CUSTOMER LEDGER
            </h4>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>NEW CLIENT</span>
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b3830] transition"
            />
          </div>

          {/* Filter Pills Row */}
          <div className="flex items-center gap-2">
            {(['all', 'due', 'advance'] as const).map((tab) => {
              const isSel = filterTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'due' ? 'Due' : 'Advance';
              return (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1 rounded-full text-xs transition cursor-pointer ${
                    isSel
                      ? 'bg-[#1b3830] text-white font-medium shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Total Due & Count Banner */}
          <div className="flex items-center justify-between text-xs font-normal text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span>
              TOTAL DUE:{' '}
              <strong className="text-slate-900 font-semibold ml-1 text-xs font-mono">
                Rs. {totalOutstanding.toLocaleString()}
              </strong>
            </span>
            <span className="text-slate-500 text-xs">
              {khataRecords.length} Clients
            </span>
          </div>

          {/* Client Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5">
            {filteredClients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <UserCheck className="w-8 h-8 text-slate-300" />
                <p className="font-medium text-slate-600">No Ledger Accounts</p>
                   <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#1b3830] text-white rounded-xl font-medium text-xs shadow-2xs cursor-pointer"
              >
                Add New Client
              </button>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSel = activeClient && String(activeClient.id) === String(client.id);
                const custName = client.customer_name || 'Khata Customer';
                const initials =
                  client.initials ||
                  custName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                const isDue = (client.total_balance || 0) > 0;

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedId(client.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSel
                        ? 'bg-[#e6f4ea] border-emerald-400/80 shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle */}
                      <div
                        className={`w-8.5 h-8.5 rounded-full font-semibold text-xs flex items-center justify-center shrink-0 text-white ${
                          client.avatar_color || (isSel ? 'bg-[#1b3830]' : 'bg-slate-600')
                        }`}
                      >
                        {initials}
                      </div>

                      {/* Name & Time */}
                      <div className="min-w-0">
                        <h5 className="font-semibold text-xs text-slate-900 truncate leading-snug">
                          {custName}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {client.time_ago || 'Recent'}
                        </p>
                      </div>
                    </div>

                    {/* Balance & Status Icon */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="font-semibold font-mono text-slate-800 text-xs">
                        Rs. {(client.total_balance || 0).toLocaleString()}
                      </span>
                      {isDue ? (
                        <div className="w-4 h-4 rounded-full border border-rose-300 bg-rose-50 text-rose-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold leading-none">!</span>
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

        {/* RIGHT PANEL: Active Client Statement Details */}
        <div className="col-span-8 lg:col-span-9 p-4 flex flex-col h-full overflow-hidden gap-3.5 bg-[#f8fafc]">
          {activeClient ? (
            <>
              {/* Client Info Header Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {activeClient.customer_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-normal mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {activeClient.phone || 'No phone'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Since {activeClient.since || (activeClient.updated_at ? new Date(activeClient.updated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Active')}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                      {typeof activeClient.total_orders === 'number' ? activeClient.total_orders : (activeClient.ledger?.length || 0)} Total Orders
                    </span>
                  </div>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowReceiveModal(true)}
                    className="px-3.5 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Receive Payment</span>
                  </button>

                  <button
                    onClick={() => setShowAddBillModal(true)}
                    className="px-3.5 py-1.5 bg-[#e6f4ea] hover:bg-[#d5ecd9] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Add Bill</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download PDF</span>
                  </button>

              

                  <button
                    onClick={handleDeleteClient}
                    title="Delete Customer Account"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>

              {/* Main Ledger Statement Table View */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Table Header Label */}
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between font-semibold text-xs text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Ledger Statement</span>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-[10.5px] uppercase font-semibold text-slate-500">
                        <th className="p-3 font-semibold">DATE</th>
                        <th className="p-3 font-semibold">REFERENCE</th>
                        <th className="p-3 text-right font-semibold">DEBIT</th>
                        <th className="p-3 text-right font-semibold">CREDIT</th>
                        <th className="p-3 text-right font-semibold">BALANCE</th>
                        <th className="p-3 text-center w-16 font-semibold">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {activeClient.ledger && activeClient.ledger.length > 0 ? (
                        activeClient.ledger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            {/* Date */}
                            <td className="p-3 font-mono text-slate-500 text-xs">
                              {item.date}
                            </td>

                            {/* Description / Reference Badge */}
                            <td className="p-3">
                              <span className="font-medium text-slate-800">
                                {item.description}
                              </span>
                              {item.type === 'Invoice' && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                                  Invoice
                                </span>
                              )}
                            </td>

                            {/* Debit */}
                            <td className="p-3 text-right font-mono font-medium text-slate-800">
                              {item.debit > 0 ? `Rs. ${item.debit.toLocaleString()}` : '-'}
                            </td>

                            {/* Credit */}
                            <td className="p-3 text-right font-mono font-medium text-slate-800">
                              {item.credit > 0 ? `Rs. ${item.credit.toLocaleString()}` : '-'}
                            </td>

                            {/* Balance Status: Green checkmark when paid in place! */}
                            <td className="p-3 text-right font-mono">
                              {!item.is_due || (item.debit > 0 && item.credit >= item.debit) ? (
                                <div className="flex justify-end">
                                  <div className="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                  </div>
                                </div>
                              ) : (
                                <span className="font-medium text-slate-800">
                                  {item.balanceText || `Rs. ${(item.debit - item.credit).toLocaleString()} DUE`}
                                </span>
                              )}
                            </td>

                            {/* Action Trash Icon */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteLedgerItem(item.id)}
                                title="Delete Entry"
                                className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                            No statement found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cumulative Account Statement Totals Banner */}
              <div className="bg-[#eef4ff] border border-blue-200 rounded-2xl p-3 justify-center flex text-xs font-normal text-slate-700 shrink-0 shadow-2xs">
                {/* Center / Right Totals */}
                <div className="flex items-center gap-6 text-xs gap-50">
                  <span>
                    TOTAL DEBIT:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {activeClientTotals.totalBilled.toLocaleString()}
                    </strong>
                  </span>

                  <span>
                    TOTAL CREDIT:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {activeClientTotals.totalReceived.toLocaleString()}
                    </strong>
                  </span>

                  {/* Net Balance Due Highlight Box */}
                  <div className="bg-[#fce8e6] text-rose-900 px-3 py-1 rounded-xl border border-rose-200 font-mono font-semibold text-xs">
                    NET BALANCE: Rs. {activeClientTotals.netBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <UserCheck className="w-10 h-10 text-slate-300" />
              <p className="font-medium text-slate-600 text-sm">No Account Selected</p>
           
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddKhataModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newCust) => {
            if (newCust?.id) {
              const custName = newCust.customer_name || newCust.name || 'New Client';
              const initials = custName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const bal = Number(newCust.total_balance || newCust.initial_balance || 0);

              const createdClient: KhataClient = {
                id: newCust.id,
                customer_name: custName,
                phone: newCust.phone || '0300-0000000',
                since: 'Just added',
                total_orders: 0,
                total_balance: bal,
                time_ago: 'Just now',
                initials,
                avatar_color: 'bg-[#1b3830]',
                ledger:
                  bal > 0
                    ? [
                        {
                          id: `leg-new-${Date.now()}`,
                          date: new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          }),
                          description: 'Initial Opening Balance',
                          type: 'Invoice',
                          debit: bal,
                          credit: 0,
                          balanceText: `Rs. ${bal.toLocaleString()} DUE`,
                          is_due: true,
                        },
                      ]
                    : [],
              };

              setKhataRecords((prev) => deduplicateClients([createdClient, ...prev]));
              setSelectedId(newCust.id);
            }
          }}
        />
      )}

      {showReceiveModal && activeClient && (
        <ReceivePaymentModal
          client={activeClient}
          onClose={() => setShowReceiveModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showAddBillModal && activeClient && (
        <AddBillModal
          client={activeClient}
          onClose={() => setShowAddBillModal(false)}
          onSuccess={handleAddBillSuccess}
        />
      )}
    </div>
  );
}
