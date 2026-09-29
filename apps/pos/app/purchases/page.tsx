'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Trash2,
  Truck,
  Phone,
  Calendar,
  Download,
  Check,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { showCatalogToast } from '@/lib/toast';
import { showProfessionalAlert } from '@/lib/alert';
import AddSupplierModal from '@/components/purchases/AddSupplierModal';
import PaySupplierModal from '@/components/purchases/PaySupplierModal';
import AddPurchaseModal from '@/components/purchases/AddPurchaseModal';

interface PurchaseLedgerItem {
  id: string;
  date: string;
  bill_number: string;
  description: string;
  type: 'Purchase' | 'Payment';
  purchase_amount: number; // DEBIT / Maal ki keemat
  paid_amount: number;     // CREDIT / Payment given
  balanceText?: string;
  is_due?: boolean;
}

interface SupplierRecord {
  id: string;
  supplier_name: string;
  phone: string;
  since?: string;
  total_purchases?: number;
  total_balance: number; // Net payable (Positive = we owe supplier)
  time_ago?: string;
  initials?: string;
  avatar_color?: string;
  ledger: PurchaseLedgerItem[];
  updated_at?: string;
}

// Initial sample supplier records for fresh load
const INITIAL_SUPPLIERS: SupplierRecord[] = [
  {
    id: 'sup-1',
    supplier_name: 'Gul Ahmed Silk Mills',
    phone: '0321-4567890',
    since: 'Jan 2024',
    total_purchases: 4,
    total_balance: 85000,
    time_ago: '2 days ago',
    initials: 'GA',
    avatar_color: 'bg-[#1b3830]',
    ledger: [
      {
        id: 'leg-p1',
        date: '24 Sep 2026',
        bill_number: 'BILL-8832',
        description: '50 Cotton Latha Suits, 20 Banarsi Rolls',
        type: 'Purchase',
        purchase_amount: 120000,
        paid_amount: 35000,
        balanceText: 'Rs. 85,000 PAYABLE',
        is_due: true,
      },
      {
        id: 'leg-p2',
        date: '10 Aug 2026',
        bill_number: 'BILL-7410',
        description: '30 Wash & Wear Suits',
        type: 'Purchase',
        purchase_amount: 45000,
        paid_amount: 45000,
        is_due: false,
      },
    ],
  },
  {
    id: 'sup-2',
    supplier_name: 'Nishat Linen Vendors',
    phone: '0300-9876543',
    since: 'Mar 2024',
    total_purchases: 2,
    total_balance: 0,
    time_ago: '1 week ago',
    initials: 'NL',
    avatar_color: 'bg-slate-700',
    ledger: [
      {
        id: 'leg-p3',
        date: '15 Sep 2026',
        bill_number: 'INV-3301',
        description: '25 Lawn Printed Unstitched Sets',
        type: 'Purchase',
        purchase_amount: 60000,
        paid_amount: 60000,
        is_due: false,
      },
    ],
  },
];

// Helper to deduplicate suppliers by ID or Name+Phone
function deduplicateSuppliers(suppliers: SupplierRecord[]): SupplierRecord[] {
  const map = new Map<string, SupplierRecord>();
  for (const s of suppliers) {
    const nameKey = (s.supplier_name || '').toLowerCase().trim();
    const phoneKey = (s.phone || '').trim();
    const dedupeKey = phoneKey && phoneKey !== '0300-0000000' ? `phone:${phoneKey}` : nameKey ? `name:${nameKey}` : s.id;

    if (!map.has(dedupeKey)) {
      map.set(dedupeKey, { ...s, ledger: s.ledger || [] });
    } else {
      const existing = map.get(dedupeKey);
      if (existing) {
        const combinedLedger = [...(existing.ledger || []), ...(s.ledger || [])];
        const ledgerMap = new Map<string, PurchaseLedgerItem>();
        combinedLedger.forEach((item) => ledgerMap.set(item.id, item));
        existing.ledger = Array.from(ledgerMap.values());
        if (typeof s.total_balance === 'number') {
          existing.total_balance = s.total_balance;
        }
      }
    }
  }
  return Array.from(map.values());
}

export default function PurchasesPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [supplierRecords, setSupplierRecords] = useState<SupplierRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'payable' | 'advance'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [showPaySupplierModal, setShowPaySupplierModal] = useState<boolean>(false);
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState<boolean>(false);

  // Mount effect to prevent Next.js SSR Hydration errors
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pos_supplier_records_v1');
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = deduplicateSuppliers(parsed);
            setSupplierRecords(clean);
            if (clean.length > 0 && clean[0] && clean[0].id) setSelectedId(clean[0].id);
            return;
          }
        } catch {}
      }
      setSupplierRecords(INITIAL_SUPPLIERS);
      if (INITIAL_SUPPLIERS.length > 0 && INITIAL_SUPPLIERS[0]) setSelectedId(INITIAL_SUPPLIERS[0].id);
    }
  }, []);

  // Save to localStorage whenever supplierRecords changes
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('pos_supplier_records_v1', JSON.stringify(supplierRecords));
    }
  }, [supplierRecords, isMounted]);

  // Filter suppliers based on search query and filter tabs
  const filteredSuppliers = useMemo(() => {
    return supplierRecords.filter((sup) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (sup.supplier_name || '').toLowerCase().includes(q) ||
        (sup.phone || '').includes(q);

      if (!matchesSearch) return false;

      if (filterTab === 'payable') return (sup.total_balance || 0) > 0;
      if (filterTab === 'advance') return (sup.total_balance || 0) <= 0;
      return true;
    });
  }, [supplierRecords, searchQuery, filterTab]);

  const activeSupplier = useMemo(() => {
    if (!selectedId) return filteredSuppliers[0] || supplierRecords[0] || null;
    return (
      supplierRecords.find((s) => String(s.id) === String(selectedId)) ||
      filteredSuppliers[0] ||
      supplierRecords[0] ||
      null
    );
  }, [supplierRecords, selectedId, filteredSuppliers]);

  // Total Payable across all suppliers (Total dukaan ne market mein kitna dena hai)
  const totalPayable = useMemo(() => {
    return supplierRecords.reduce((sum, s) => sum + (s.total_balance > 0 ? s.total_balance : 0), 0);
  }, [supplierRecords]);

  // Calculations for active supplier's purchase statement
  const activeSupplierTotals = useMemo(() => {
    if (!activeSupplier || !activeSupplier.ledger) {
      return { totalPurchases: 0, totalPaid: 0, netPayable: 0 };
    }
    const totalPurchases = activeSupplier.ledger.reduce((sum, item) => sum + (item.purchase_amount || 0), 0);
    const totalPaid = activeSupplier.ledger.reduce((sum, item) => sum + (item.paid_amount || 0), 0);
    const netPayable = totalPurchases - totalPaid;
    return { totalPurchases, totalPaid, netPayable };
  }, [activeSupplier]);

  // Handle Single Supplier Deletion
  const handleDeleteSupplier = () => {
    if (!activeSupplier) return;
    if (!confirm(`Are you sure you want to delete Supplier account for ${activeSupplier.supplier_name}?`)) return;

    showCatalogToast(`Deleted Supplier account: ${activeSupplier.supplier_name}`, 'delete');
    const updated = supplierRecords.filter((s) => String(s.id) !== String(activeSupplier.id));
    setSupplierRecords(updated);
    setSelectedId(updated[0]?.id || null);
  };

  // Handle Ledger Item Deletion for Active Supplier ONLY
  const handleDeleteLedgerItem = (itemId: string) => {
    if (!activeSupplier) return;
    setSupplierRecords((prev) =>
      prev.map((s) => {
        if (String(s.id) === String(activeSupplier.id)) {
          const newLedger = s.ledger.filter((item) => String(item.id) !== String(itemId));
          const newPurchases = newLedger.reduce((sum, i) => sum + (i.purchase_amount || 0), 0);
          const newPaid = newLedger.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
          return {
            ...s,
            ledger: newLedger,
            total_balance: Math.max(0, newPurchases - newPaid),
          };
        }
        return s;
      })
    );
    showCatalogToast('Purchase entry removed', 'delete');
  };

  // Handle Pay Supplier Success: Clears dues on existing purchase entries in place!
  const handlePaySupplierSuccess = (info?: any) => {
    if (!activeSupplier) return;
    let paymentAmount = Number(info?.amount || 0);
    if (paymentAmount <= 0) return;

    setSupplierRecords((prev) =>
      prev.map((s) => {
        if (String(s.id) === String(activeSupplier.id)) {
          const currentLedger = [...(s.ledger || [])];
          let remainingPayment = paymentAmount;
          let hasUpdatedExisting = false;

          // 1. Update existing due purchase entries in place
          const updatedLedger = currentLedger.map((item) => {
            if (remainingPayment > 0 && item.is_due) {
              hasUpdatedExisting = true;
              const itemDue = Math.max(0, item.purchase_amount - (item.paid_amount || 0));
              if (remainingPayment >= itemDue) {
                remainingPayment -= itemDue;
                return {
                  ...item,
                  paid_amount: item.purchase_amount,
                  is_due: false,
                  balanceText: undefined,
                };
              } else {
                const newPaid = (item.paid_amount || 0) + remainingPayment;
                const rem = item.purchase_amount - newPaid;
                remainingPayment = 0;
                return {
                  ...item,
                  paid_amount: newPaid,
                  balanceText: `Rs. ${rem.toLocaleString()} PAYABLE`,
                  is_due: true,
                };
              }
            }
            return item;
          });

          // 2. If no due items were found or payment exceeded dues, add leftover payment record
          if (!hasUpdatedExisting && remainingPayment > 0) {
            const methodText =
              info?.method === 'BANK'
                ? 'Bank Payment to Vendor'
                : info?.method === 'DIGITAL'
                ? 'Digital Payment to Vendor'
                : 'Cash Payment to Vendor';
            const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            updatedLedger.unshift({
              id: `leg-sup-pay-${Date.now()}`,
              date: todayStr,
              bill_number: `PAY-${Math.floor(100 + Math.random() * 900)}`,
              description: info?.note ? `${methodText} (${info.note})` : methodText,
              type: 'Payment',
              purchase_amount: 0,
              paid_amount: remainingPayment,
              is_due: false,
            });
          }

          const newPurchases = updatedLedger.reduce((sum, i) => sum + (i.purchase_amount || 0), 0);
          const newPaidTotal = updatedLedger.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
          const netBal = Math.max(0, newPurchases - newPaidTotal);

          return {
            ...s,
            ledger: updatedLedger,
            total_balance: netBal,
            time_ago: 'Just now',
          };
        }
        return s;
      })
    );
  };

  // Handle Add Purchase Success: Appends new purchase entry to active supplier
  const handleAddPurchaseSuccess = (info?: any) => {
    if (!activeSupplier) return;
    const purAmount = Number(info?.purchase_amount || 0);
    const paidAmountNow = Number(info?.paid_amount || 0);
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const isDue = purAmount > paidAmountNow;
    const dueAmount = purAmount - paidAmountNow;

    setSupplierRecords((prev) =>
      prev.map((s) => {
        if (String(s.id) === String(activeSupplier.id)) {
          const newLedgerItem: PurchaseLedgerItem = {
            id: `leg-pur-${Date.now()}`,
            date: todayStr,
            bill_number: info?.bill_number || `BILL-${Math.floor(100 + Math.random() * 900)}`,
            description: info?.description || 'Stock Purchase Entry',
            type: 'Purchase',
            purchase_amount: purAmount,
            paid_amount: paidAmountNow,
            balanceText: isDue ? `Rs. ${dueAmount.toLocaleString()} PAYABLE` : undefined,
            is_due: isDue,
          };
          const updatedLedger = [newLedgerItem, ...(s.ledger || [])];
          const newPurchases = updatedLedger.reduce((sum, i) => sum + (i.purchase_amount || 0), 0);
          const newPaid = updatedLedger.reduce((sum, i) => sum + (i.paid_amount || 0), 0);
          return {
            ...s,
            ledger: updatedLedger,
            total_purchases: (s.total_purchases || 0) + 1,
            total_balance: Math.max(0, newPurchases - newPaid),
            time_ago: 'Just now',
          };
        }
        return s;
      })
    );
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs">
        Loading Supplier Ledger...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden font-sans p-1">
      {/* Edge to Edge Main Split Screen */}
      <div className="grid grid-cols-12 flex-1 w-full h-full min-h-0 bg-[#f8fafc] overflow-hidden">
        
        {/* ─── 1. LEFT PANEL: Supplier Search & Supplier Accounts List ─── */}
        <div className="col-span-4 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden p-3.5 gap-3">
          
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-700 text-xs tracking-wider uppercase truncate">
              SUPPLIER LEDGER
            </h4>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow-2xs shrink-0"
            >
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>+ NEW SUPPLIER</span>
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b3830] transition"
            />
          </div>

          {/* Filter Pills Row */}
          <div className="flex items-center gap-2">
            {(['all', 'payable', 'advance'] as const).map((tab) => {
              const isSel = filterTab === tab;
              const label = tab === 'all' ? 'All' : tab === 'payable' ? 'Payable' : 'Advance';
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

          {/* Total Payable & Count Banner */}
          <div className="flex items-center justify-between text-xs font-normal text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span>
              TOTAL PAYABLE:{' '}
              <strong className="text-slate-900 font-semibold ml-1 text-xs font-mono">
                Rs. {totalPayable.toLocaleString()}
              </strong>
            </span>
            <span className="text-slate-500 text-xs">
              {supplierRecords.length} Suppliers
            </span>
          </div>

          {/* Supplier Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5">
            {filteredSuppliers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <UserCheck className="w-8 h-8 text-slate-300" />
                <p className="font-medium text-slate-600">No Supplier Accounts Found</p>
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="px-4 py-2 bg-[#1b3830] text-white rounded-xl font-medium text-xs shadow-2xs cursor-pointer"
                >
                  Add New Supplier
                </button>
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const isSel = activeSupplier && String(activeSupplier.id) === String(sup.id);
                const supName = sup.supplier_name || 'Wholesaler';
                const initials =
                  sup.initials ||
                  supName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                const isPayable = (sup.total_balance || 0) > 0;

                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedId(sup.id)}
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
                          sup.avatar_color || (isSel ? 'bg-[#1b3830]' : 'bg-slate-600')
                        }`}
                      >
                        {initials}
                      </div>

                      {/* Name & Time */}
                      <div className="min-w-0">
                        <h5 className="font-semibold text-xs text-slate-900 truncate leading-snug">
                          {supName}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {sup.time_ago || 'Recent'}
                        </p>
                      </div>
                    </div>

                    {/* Balance & Status Icon */}
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className="font-semibold font-mono text-slate-800 text-xs">
                        Rs. {(sup.total_balance || 0).toLocaleString()}
                      </span>
                      {isPayable ? (
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

        {/* ─── 2. RIGHT PANEL: Active Supplier Statement Details ─── */}
        <div className="col-span-8 lg:col-span-9 p-4 flex flex-col h-full overflow-hidden gap-3.5 bg-[#f8fafc]">
          {activeSupplier ? (
            <>
              {/* Supplier Info Header Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {activeSupplier.supplier_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-normal mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {activeSupplier.phone || 'No phone'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Since {activeSupplier.since || (activeSupplier.updated_at ? new Date(activeSupplier.updated_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Active')}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                      {typeof activeSupplier.total_purchases === 'number' ? activeSupplier.total_purchases : (activeSupplier.ledger?.length || 0)} Total Purchases
                    </span>
                  </div>
                </div>

                {/* Toolbar Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Pay Supplier / Make Payment */}
                  <button
                    onClick={() => setShowPaySupplierModal(true)}
                    className="px-3.5 py-1.5 bg-[#fce8e6] hover:bg-[#f9d7d4] text-rose-800 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Pay Supplier</span>
                  </button>

                  {/* Add Purchase Entry */}
                  <button
                    onClick={() => setShowAddPurchaseModal(true)}
                    className="px-3.5 py-1.5 bg-[#e6f4ea] hover:bg-[#d5ecd9] text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Add Purchase</span>
                  </button>

                  {/* Download PDF */}
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download PDF</span>
                  </button>

                  {/* Delete Supplier */}
                  <button
                    onClick={handleDeleteSupplier}
                    title="Delete Supplier Account"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>

              {/* ─── 3. Main Purchase Statement Table View ─── */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Section Title */}
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between font-semibold text-xs text-slate-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>PURCHASE STATEMENT</span>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-[10.5px] uppercase font-semibold text-slate-500">
                        <th className="p-3 font-semibold">DATE</th>
                        <th className="p-3 font-semibold">BILL / INVOICE #</th>
                        <th className="p-3 font-semibold">DESCRIPTION / ITEMS</th>
                        <th className="p-3 text-right font-semibold">PURCHASE AMOUNT</th>
                        <th className="p-3 text-right font-semibold">PAID AMOUNT</th>
                        <th className="p-3 text-right font-semibold">BALANCE</th>
                        <th className="p-3 text-center w-16 font-semibold">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {activeSupplier.ledger && activeSupplier.ledger.length > 0 ? (
                        activeSupplier.ledger.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            {/* Date */}
                            <td className="p-3 font-mono text-slate-500 text-xs">
                              {item.date}
                            </td>

                            {/* Bill / Invoice # */}
                            <td className="p-3 font-mono font-medium text-slate-800">
                              {item.bill_number}
                            </td>

                            {/* Description / Items Summary */}
                            <td className="p-3">
                              <span className="font-medium text-slate-800">
                                {item.description}
                              </span>
                              {item.type === 'Purchase' && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded">
                                  Purchase
                                </span>
                              )}
                            </td>

                            {/* Purchase Amount (Debit) */}
                            <td className="p-3 text-right font-mono font-medium text-slate-800">
                              {item.purchase_amount > 0 ? `Rs. ${item.purchase_amount.toLocaleString()}` : '-'}
                            </td>

                            {/* Paid Amount (Credit) */}
                            <td className="p-3 text-right font-mono font-medium text-slate-800">
                              {item.paid_amount > 0 ? `Rs. ${item.paid_amount.toLocaleString()}` : '-'}
                            </td>

                            {/* Balance Status: Green checkmark when paid in place! */}
                            <td className="p-3 text-right font-mono">
                              {!item.is_due || (item.purchase_amount > 0 && item.paid_amount >= item.purchase_amount) ? (
                                <div className="flex justify-end">
                                  <div className="w-5 h-5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                  </div>
                                </div>
                              ) : (
                                <span className="font-medium text-slate-800">
                                  {item.balanceText || `Rs. ${(item.purchase_amount - item.paid_amount).toLocaleString()} PAYABLE`}
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
                          <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                            No purchase statement found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── 4. Bottom Summary Bar ─── */}
              <div className="bg-[#eef4ff] border border-blue-200 rounded-2xl p-3 justify-center flex text-xs font-normal text-slate-700 shrink-0 shadow-2xs">
                <div className="flex items-center gap-6 text-xs gap-50">
                  <span>
                    TOTAL PURCHASES:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {activeSupplierTotals.totalPurchases.toLocaleString()}
                    </strong>
                  </span>

                  <span>
                    TOTAL PAID:{' '}
                    <strong className="font-mono text-slate-900 font-semibold text-xs ml-1">
                      Rs. {activeSupplierTotals.totalPaid.toLocaleString()}
                    </strong>
                  </span>

                  {/* Net Payable Highlight Box */}
                  <div className="bg-[#fce8e6] text-rose-900 px-3 py-1 rounded-xl border border-rose-200 font-mono font-semibold text-xs">
                    NET PAYABLE: Rs. {activeSupplierTotals.netPayable.toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-3">
              <UserCheck className="w-10 h-10 text-slate-300" />
              <p className="font-medium text-slate-600 text-sm">No Supplier Account Selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddSupplierModal && (
        <AddSupplierModal
          onClose={() => setShowAddSupplierModal(false)}
          onSuccess={(newSup) => {
            if (newSup?.id) {
              setSupplierRecords((prev) => deduplicateSuppliers([newSup, ...prev]));
              setSelectedId(newSup.id);
            }
          }}
        />
      )}

      {showPaySupplierModal && activeSupplier && (
        <PaySupplierModal
          supplier={activeSupplier}
          onClose={() => setShowPaySupplierModal(false)}
          onSuccess={handlePaySupplierSuccess}
        />
      )}

      {showAddPurchaseModal && activeSupplier && (
        <AddPurchaseModal
          supplier={activeSupplier}
          onClose={() => setShowAddPurchaseModal(false)}
          onSuccess={handleAddPurchaseSuccess}
        />
      )}
    </div>
  );
}
