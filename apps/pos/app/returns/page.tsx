'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Printer,
  Trash2,
  Download,
  X,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { showCatalogToast } from '@/lib/toast';
import { playToastAudio } from '@/lib/toastAudio';
import { showProfessionalAlert } from '@/lib/alert';
import { fetchBillingHistory } from '@/lib/api';
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal';

/* ──────────────────────── Interfaces ──────────────────────── */

interface CustomerReturnRecord {
  id: string;
  return_code: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  original_invoice: string;
  returned_items: string;
  total_value: number;
  refund_type: 'Cash Refund' | 'Khata Credit' | 'Exchanged';
  exchange_extra?: number;
  condition: 'Restocked' | 'Damaged';
  status: 'Completed' | 'Pending Settlement';
  reason?: string;
}

interface SupplierReturnRecord {
  id: string;
  return_code: string;
  date: string;
  supplier_name: string;
  purchase_bill: string;
  items_returned: string;
  total_value: number;
  settlement_status: 'Ledgers Synced' | 'Cash Received';
  reason: string;
  status: 'Completed' | 'Pending Settlement';
}

/* ──────────────────────── Restock Package SVG Icon (3D Box + Checkmark Badge) ──────────────────────── */
const RestockPackageIcon = ({ className = "w-4 h-4 text-emerald-600" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
    <circle cx="16.5" cy="16.5" r="4.5" fill="#059669" stroke="white" strokeWidth="1.5" />
    <path d="m14.5 16.5 1.2 1.2 2.8-2.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ──────────────────────── Initial Mock Data ──────────────────────── */

const INITIAL_CUSTOMER_RECORDS: CustomerReturnRecord[] = [
  {
    id: 'cr-1048',
    return_code: '#CR-1048',
    date: 'Today, 22 Nov 2023',
    customer_name: 'Chaudhry Kashif',
    customer_phone: '0321-4455667',
    original_invoice: '#INV-8840',
    returned_items: '2x Cotton Unstitched (Premium Karandi - Grey/Navy)',
    total_value: 6800,
    refund_type: 'Khata Credit',
    condition: 'Restocked',
    status: 'Completed',
  },
  {
    id: 'cr-1045',
    return_code: '#CR-1045',
    date: '20 Nov 2023',
    customer_name: 'Tariq Boutique Lahore',
    customer_phone: '0300-8899112',
    original_invoice: '#INV-8792',
    returned_items: '35 Meters Lawn Roll (Digital Print 90/70 Quality)',
    total_value: 17500,
    refund_type: 'Cash Refund',
    condition: 'Damaged',
    status: 'Completed',
  },
  {
    id: 'cr-1039',
    return_code: '#CR-1039',
    date: '18 Nov 2023',
    customer_name: 'Walk-in Customer',
    customer_phone: 'Counter POS / Cash',
    original_invoice: '#INV-8650',
    returned_items: '1x Wash & Wear Suit (Boski Cream Shade mismatch)',
    total_value: 4200,
    refund_type: 'Exchanged',
    exchange_extra: 1200,
    condition: 'Restocked',
    status: 'Completed',
  },
  {
    id: 'cr-1032',
    return_code: '#CR-1032',
    date: '15 Nov 2023',
    customer_name: 'Malik Cloth House',
    customer_phone: 'Faisalabad Agency',
    original_invoice: '#INV-8510',
    returned_items: '4x Pure Jacquard Suits (Defective Weave Borders)',
    total_value: 12000,
    refund_type: 'Khata Credit',
    condition: 'Damaged',
    status: 'Completed',
  },
];

const INITIAL_SUPPLIER_RECORDS: SupplierReturnRecord[] = [
  {
    id: 'sr-305',
    return_code: '#SR-305',
    date: '24 Nov 2023',
    supplier_name: 'Gul Ahmed Silk Mills',
    purchase_bill: '#BILL-8832',
    items_returned: '50 Meters Silk Roll (Shade Mismatch)',
    total_value: 150000,
    settlement_status: 'Ledgers Synced',
    reason: 'Shade Mismatch',
    status: 'Completed',
  },
  {
    id: 'sr-304',
    return_code: '#SR-304',
    date: '18 Nov 2023',
    supplier_name: 'Nishat Linen Vendors',
    purchase_bill: '#BILL-7410',
    items_returned: '150 M Printed Lawn (Defect Weave)',
    total_value: 135000,
    settlement_status: 'Ledgers Synced',
    reason: 'Defective Fabric',
    status: 'Completed',
  },
];

export default function ReturnsManagementPage() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);

  // Tab State: Customer Returns vs Supplier Returns
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'restocked' | 'damaged'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 25;

  // Reset page on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  // Records state
  const [customerRecords, setCustomerRecords] = useState<CustomerReturnRecord[]>([]);
  const [supplierRecords, setSupplierRecords] = useState<SupplierReturnRecord[]>([]);

  // ── RIGHT SIDE SLIDE-IN WORKFLOW DRAWER STATE ──
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [workflowTab, setWorkflowTab] = useState<'customer' | 'supplier'>('customer');

  // Workflow Form State (Customer)
  const [wfInvoiceInput, setWfInvoiceInput] = useState('');
  const [wfFetchedInvoice, setWfFetchedInvoice] = useState<any | null>(null);
  const [wfIsFetching, setWfIsFetching] = useState(false);
  const [wfCondition, setWfCondition] = useState<'RESTOCKABLE' | 'DAMAGED'>('RESTOCKABLE');
  const [wfSettlement, setWfSettlement] = useState<'CASH' | 'KHATA_CREDIT' | 'EXCHANGE'>('KHATA_CREDIT');

  // Workflow Form State (Supplier)
  const [wfSupplierName, setWfSupplierName] = useState('');
  const [wfPurchaseBill, setWfPurchaseBill] = useState('');
  const [wfReturnedItemsText, setWfReturnedItemsText] = useState('');
  const [wfSupplierReturnValue, setWfSupplierReturnValue] = useState<number>(0);
  const [wfSupplierReason, setWfSupplierReason] = useState('Defective Fabric');

  // Interactive Detail Modal & Delete Confirmation Modal States
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<{ record: any; type: 'customer' | 'supplier' } | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; type: 'customer' | 'supplier'; code: string } | null>(null);

  const showValidationError = (title: string, message: string) => {
    showProfessionalAlert(message, title, 'return');
  };

  const confirmDeleteRecord = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'customer') {
      setCustomerRecords((prev) => prev.filter((r) => r.id !== deleteConfirmTarget.id));
    } else {
      setSupplierRecords((prev) => prev.filter((r) => r.id !== deleteConfirmTarget.id));
    }
    showCatalogToast(`Record ${deleteConfirmTarget.code} deleted`, 'delete');
    setDeleteConfirmTarget(null);
  };

  // SSR Hydration Safe Guard & Smooth Page Entrance Trigger
  useEffect(() => {
    setIsMounted(true);
    requestAnimationFrame(() => setPageLoaded(true));

    if (typeof window !== 'undefined') {
      const cStored = localStorage.getItem('pos_customer_returns_v2');
      if (cStored) {
        try {
          const parsed = JSON.parse(cStored);
          setCustomerRecords(Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CUSTOMER_RECORDS);
        } catch { setCustomerRecords(INITIAL_CUSTOMER_RECORDS); }
      } else { setCustomerRecords(INITIAL_CUSTOMER_RECORDS); }

      const sStored = localStorage.getItem('pos_supplier_returns_v2');
      if (sStored) {
        try {
          const parsed = JSON.parse(sStored);
          setSupplierRecords(Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SUPPLIER_RECORDS);
        } catch { setSupplierRecords(INITIAL_SUPPLIER_RECORDS); }
      } else { setSupplierRecords(INITIAL_SUPPLIER_RECORDS); }
    }
  }, []);

  // Save changes to LocalStorage
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('pos_customer_returns_v2', JSON.stringify(customerRecords));
    }
  }, [customerRecords, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('pos_supplier_returns_v2', JSON.stringify(supplierRecords));
    }
  }, [supplierRecords, isMounted]);

  /* ── Filter Logic ── */
  const filteredCustomerRecords = useMemo(() => {
    return customerRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m =
          rec.return_code?.toLowerCase().includes(q) ||
          rec.customer_name?.toLowerCase().includes(q) ||
          rec.original_invoice?.toLowerCase().includes(q) ||
          rec.returned_items?.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (statusFilter === 'completed' && rec.status !== 'Completed') return false;
      if (statusFilter === 'pending' && rec.status !== 'Pending Settlement') return false;
      if (statusFilter === 'restocked' && rec.condition !== 'Restocked') return false;
      if (statusFilter === 'damaged' && rec.condition !== 'Damaged') return false;
      return true;
    });
  }, [customerRecords, searchQuery, statusFilter]);

  const filteredSupplierRecords = useMemo(() => {
    return supplierRecords.filter((rec) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m =
          rec.return_code?.toLowerCase().includes(q) ||
          rec.supplier_name?.toLowerCase().includes(q) ||
          rec.purchase_bill?.toLowerCase().includes(q);
        if (!m) return false;
      }
      if (statusFilter === 'completed' && rec.status !== 'Completed') return false;
      if (statusFilter === 'pending' && rec.status !== 'Pending Settlement') return false;
      return true;
    });
  }, [supplierRecords, searchQuery, statusFilter]);

  /* ── Dynamic Real Data Metrics ── */
  const metrics = useMemo(() => {
    const totalCustomerVal = customerRecords.reduce((sum, r) => sum + (r.total_value || 0), 0);
    const totalSupplierVal = supplierRecords.reduce((sum, r) => sum + (r.total_value || 0), 0);

    const pendingCustomerVal = customerRecords
      .filter((r) => r.status === 'Pending Settlement')
      .reduce((sum, r) => sum + (r.total_value || 0), 0);
    const pendingSupplierVal = supplierRecords
      .filter((r) => r.status === 'Pending Settlement')
      .reduce((sum, r) => sum + (r.total_value || 0), 0);
    const pendingTotalVal = pendingCustomerVal + pendingSupplierVal;

    const damagedCount = customerRecords.filter((r) => r.condition === 'Damaged').length;

    const currentTabRecords = activeTab === 'customer' ? customerRecords : supplierRecords;
    const countAll = currentTabRecords.length;
    const countCompleted = currentTabRecords.filter((r) => r.status === 'Completed').length;
    const countPending = currentTabRecords.filter((r) => r.status === 'Pending Settlement').length;
    const countRestocked = activeTab === 'customer'
      ? customerRecords.filter((r) => r.condition === 'Restocked').length
      : 0;
    const countDamaged = activeTab === 'customer'
      ? customerRecords.filter((r) => r.condition === 'Damaged').length
      : supplierRecords.filter((r) => r.reason?.toLowerCase().includes('defect') || r.reason?.toLowerCase().includes('damage')).length;

    return {
      totalCustomerVal,
      totalCustomerCount: customerRecords.length,
      totalSupplierVal,
      totalSupplierCount: supplierRecords.length,
      pendingTotalVal,
      damagedCount,
      countAll,
      countCompleted,
      countPending,
      countRestocked,
      countDamaged,
    };
  }, [customerRecords, supplierRecords, activeTab]);

  const paginatedCustomerRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomerRecords.slice(start, start + PAGE_SIZE);
  }, [filteredCustomerRecords, currentPage]);

  const paginatedSupplierRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSupplierRecords.slice(start, start + PAGE_SIZE);
  }, [filteredSupplierRecords, currentPage]);

  const currentTotal = activeTab === 'customer' ? filteredCustomerRecords.length : filteredSupplierRecords.length;
  const startIndex = currentTotal === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * PAGE_SIZE, currentTotal);

  /* ── Fetch Bill in Workflow Panel ── */
  const handleFetchBill = async () => {
    if (!wfInvoiceInput.trim()) {
      showValidationError("Invoice Missing", "Baraye meharbani pehle Sales Invoice # (maslan #INV-8840) darj karein.");
      return;
    }
    setWfIsFetching(true);
    try {
      const history = await fetchBillingHistory();
      if (Array.isArray(history)) {
        const match = history.find(
          (h) => h.invoice_number?.toLowerCase() === wfInvoiceInput.trim().toLowerCase()
        );
        if (match) {
          let items: any[] = [];
          try { items = typeof match.item_details_json === 'string' ? JSON.parse(match.item_details_json) : match.item_details_json; } catch { }
          setWfFetchedInvoice({
            invoice_number: match.invoice_number,
            customer_name: match.customer_phone || 'Walk-in Client',
            customer_phone: match.customer_phone || '0300-0000000',
            total_amount: match.total_amount || 0,
            items: items.map((i: any, idx: number) => ({
              id: String(idx),
              name: i.name || i.product_name || 'Fabric Item',
              qty: i.quantity || 1,
              price: i.price || 0,
              selected: true,
            })),
          });
          setWfIsFetching(false);
          return;
        }
      }
    } catch { }

    setWfFetchedInvoice(null);
    setWfIsFetching(false);
    showValidationError(
      "Invoice Not Found",
      `Invoice number "${wfInvoiceInput}" system billing history me nahi mil saki. Baraye meharbani durust invoice number darj karein.`
    );
  };

  const wfSelectedReturnValue = useMemo(() => {
    if (!wfFetchedInvoice?.items) return 0;
    return wfFetchedInvoice.items
      .filter((i: any) => i.selected)
      .reduce((sum: number, i: any) => sum + (i.qty * i.price), 0);
  }, [wfFetchedInvoice]);

  const handleProcessWorkflow = () => {
    const todayStr = `Today, ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

    if (workflowTab === 'customer') {
      if (!wfFetchedInvoice || !wfFetchedInvoice.items || wfFetchedInvoice.items.length === 0) {
        showValidationError("Invoice Missing", "Pehle ek durust invoice search aur fetch karein.");
        return;
      }
      const selectedItems = wfFetchedInvoice.items.filter((i: any) => i.selected);
      if (selectedItems.length === 0 || wfSelectedReturnValue <= 0) {
        showValidationError("No Item Selected", "Baraye meharbani return karne ke liye kam se kam 1 item select karein.");
        return;
      }

      const code = `#CR-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedItemsText = selectedItems
        .map((i: any) => `${i.qty}x ${i.name}`)
        .join(', ');

      const newRec: CustomerReturnRecord = {
        id: `cr-${Date.now()}`,
        return_code: code,
        date: todayStr,
        customer_name: wfFetchedInvoice.customer_name || 'Walk-in Customer',
        customer_phone: wfFetchedInvoice.customer_phone || '0300-0000000',
        original_invoice: wfFetchedInvoice.invoice_number,
        returned_items: selectedItemsText,
        total_value: wfSelectedReturnValue,
        refund_type: wfSettlement === 'CASH' ? 'Cash Refund' : wfSettlement === 'KHATA_CREDIT' ? 'Khata Credit' : 'Exchanged',
        condition: wfCondition === 'RESTOCKABLE' ? 'Restocked' : 'Damaged',
        status: 'Completed',
        reason: 'Customer Return & Stock Adjustment',
      };

      // Real Inventory Stock Update if Restockable!
      if (wfCondition === 'RESTOCKABLE' && typeof window !== 'undefined') {
        const pCache = localStorage.getItem('pos_products_v2');
        if (pCache) {
          try {
            const products = JSON.parse(pCache);
            const updatedProducts = products.map((p: any) => {
              const matchedItem = selectedItems.find((itm: any) => p.name?.toLowerCase().includes(itm.name.toLowerCase()));
              if (matchedItem) {
                return {
                  ...p,
                  stock: (p.stock || 0) + (matchedItem.qty || 1),
                };
              }
              return p;
            });
            localStorage.setItem('pos_products_v2', JSON.stringify(updatedProducts));
          } catch { }
        }
      }

      if (wfSettlement === 'KHATA_CREDIT' && typeof window !== 'undefined') {
        const kStored = localStorage.getItem('pos_khata_records_v4');
        if (kStored) {
          try {
            const records = JSON.parse(kStored);
            const updated = records.map((c: any) => {
              if (c.customer_name?.toLowerCase() === newRec.customer_name.toLowerCase() || c.phone === newRec.customer_phone) {
                const newBal = Math.max(0, (c.total_balance || 0) - wfSelectedReturnValue);
                return {
                  ...c,
                  total_balance: newBal,
                  ledger: [
                    {
                      id: `leg-cr-${Date.now()}`,
                      date: todayStr,
                      description: `Store Credit (${code})`,
                      type: 'Payment',
                      debit: 0,
                      credit: wfSelectedReturnValue,
                      is_due: false,
                    },
                    ...(c.ledger || []),
                  ],
                };
              }
              return c;
            });
            localStorage.setItem('pos_khata_records_v4', JSON.stringify(updated));
          } catch { }
        }
      }

      setCustomerRecords((prev) => [newRec, ...prev]);
      playToastAudio('add');
      showCatalogToast(`Return ${code} Processed & Real Stock updated!`, 'add');
    } else {
      if (!wfSupplierName.trim() || !wfPurchaseBill.trim() || !wfReturnedItemsText.trim() || wfSupplierReturnValue <= 0) {
        showValidationError(
          "Supplier Info Incomplete",
          "Baraye meharbani Wholesaler name, Purchase bill #, returned items detail aur durust return amount (greater than 0) darj karein."
        );
        return;
      }

      const code = `#SR-${Math.floor(300 + Math.random() * 900)}`;
      const newRec: SupplierReturnRecord = {
        id: `sr-${Date.now()}`,
        return_code: code,
        date: todayStr,
        supplier_name: wfSupplierName,
        purchase_bill: wfPurchaseBill,
        items_returned: wfReturnedItemsText,
        total_value: wfSupplierReturnValue,
        settlement_status: 'Ledgers Synced',
        reason: wfSupplierReason || 'Defective Fabric',
        status: 'Completed',
      };

      if (typeof window !== 'undefined') {
        const sStored = localStorage.getItem('pos_supplier_records_v1');
        if (sStored) {
          try {
            const records = JSON.parse(sStored);
            const updated = records.map((sup: any) => {
              if (sup.supplier_name?.toLowerCase().includes(wfSupplierName.toLowerCase())) {
                const newBal = Math.max(0, (sup.total_balance || 0) - wfSupplierReturnValue);
                return {
                  ...sup,
                  total_balance: newBal,
                  ledger: [
                    {
                      id: `leg-sr-${Date.now()}`,
                      date: '28 Sep 2026',
                      bill_number: code,
                      description: `Debit Note (${wfReturnedItemsText})`,
                      type: 'Payment',
                      purchase_amount: 0,
                      paid_amount: wfSupplierReturnValue,
                      is_due: false,
                    },
                    ...(sup.ledger || []),
                  ],
                };
              }
              return sup;
            });
            localStorage.setItem('pos_supplier_records_v1', JSON.stringify(updated));
          } catch { }
        }
      }

      setSupplierRecords((prev) => [newRec, ...prev]);
      playToastAudio('add');
      showCatalogToast(`Debit Note ${code} generated & Supplier Ledger updated!`, 'add');
    }

    setIsWorkflowOpen(false);
  };

  const handleDeleteRecord = (id: string, type: 'customer' | 'supplier', code: string) => {
    setDeleteConfirmTarget({ id, type, code });
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8fafc] text-slate-400 font-sans text-xs">
        Loading Returns & Exchanges Management...
      </div>
    );
  }

  return (
    <>
      {/* ═══════════════ SCROLLABLE PAGE (TOP → BOTTOM) ═══════════════ */}
      <div
        className={`w-full h-full overflow-y-auto overflow-x-hidden bg-[#f8fafc] font-sans scroll-smooth transition-all duration-500 ease-out [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full ${pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
      >
        <div className="flex flex-col w-full p-4 pb-10 space-y-4">

          {/* ─── HEADER BAR ─── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all duration-300">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  RETURNS & EXCHANGES MANAGEMENT
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export Records</span>
              </button>

              {/* + NEW RETURN BUTTON */}
              <button
                onClick={() => setIsWorkflowOpen(true)}
                className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300"
              >
                <Plus className="w-4 h-4 text-emerald-400 animate-spin-once" />
                <span>New Return</span>
              </button>
            </div>
          </div>

          {/* ─── SUB-HEADER TABS SWITCHER ─── */}
          <div className="flex items-center gap-3 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab('customer')}
              className={`pb-2 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border-b-2 ${activeTab === 'customer'
                ? 'border-[#1b3830] text-[#1b3830] scale-100'
                : 'border-transparent text-slate-500 hover:text-slate-800 scale-98'
                }`}
            >
              <span>Customer Returns</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full transition-transform duration-200 hover:scale-105">
                {customerRecords.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('supplier')}
              className={`pb-2 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border-b-2 ${activeTab === 'supplier'
                ? 'border-[#1b3830] text-[#1b3830] scale-100'
                : 'border-transparent text-slate-500 hover:text-slate-800 scale-98'
                }`}
            >
              <span>Supplier Returns</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full transition-transform duration-200 hover:scale-105">
                {supplierRecords.length}
              </span>
            </button>
          </div>

          {/* ─── 4 TOP METRIC CARDS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Customer Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Total Customer Returns</span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900 group-hover:scale-105 transition-transform origin-left ">
                {formatCurrency(metrics.totalCustomerVal)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{metrics.totalCustomerCount} Returns processed</span>
              </div>
            </div>

            {/* Card 2: Total Supplier Returns */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Total Supplier Returns</span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-slate-900 group-hover:scale-105 transition-transform origin-left ">
                {formatCurrency(metrics.totalSupplierVal)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{metrics.totalSupplierCount} Debit notes</span>
              </div>
            </div>

            {/* Card 3: Pending Settlements */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Pending Settlements</span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono group-hover:scale-105 transition-transform origin-left">
                {formatCurrency(metrics.pendingTotalVal)}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>{metrics.countPending} Pending records</span>
              </div>
            </div>

            {/* Card 4: Damaged / Defect Stock */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Damaged Stock</span>
              </div>
              <div className="mt-2 text-2xl font-black font-mono group-hover:scale-105 transition-transform origin-left">
                {metrics.damagedCount} Items
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Defect warehouse bin #4</span>
              </div>
            </div>
          </div>

          {/* ─── SEARCH & FILTER PILLS ROW ─── */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300">
            {/* Search Bar */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#1b3830]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#1b3830] transition-all duration-200"
              />
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">STATUS:</span>

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                All ({metrics.countAll})
              </button>

              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${statusFilter === 'completed'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Completed ({metrics.countCompleted})
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${statusFilter === 'pending'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Pending Settlement ({metrics.countPending})
              </button>

              <button
                onClick={() => setStatusFilter('restocked')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${statusFilter === 'restocked'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Restocked ({metrics.countRestocked})
              </button>

              <button
                onClick={() => setStatusFilter('damaged')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 ${statusFilter === 'damaged'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Damaged Claim ({metrics.countDamaged})
              </button>
            </div>
          </div>

          {/* ─── MAIN TABLE VIEW ─── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col transition-all duration-300">
            {/* Table Title Bar */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-slate-800">
                  {activeTab === 'customer'
                    ? 'Customer Returns & Exchanges Ledger'
                    : 'Supplier Purchase Debit Notes Ledger'}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Showing {startIndex} - {endIndex} of {currentTotal} records
              </span>
            </div>

            {/* CUSTOMER RETURNS TABLE */}
            {activeTab === 'customer' && (
              <div className="w-full overflow-hidden no-scrollbar">
                <table className="w-full text-left text-xs font-sans table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/60 text-[10.5px] uppercase font-bold text-slate-500 font-mono">
                      <th className="px-3 py-2 w-[14%]">RETURN ID & DATE</th>
                      <th className="px-3 py-2 w-[18%]">CUSTOMER INFO</th>
                      <th className="px-3 py-2 w-[12%]">ORIG. INVOICE</th>
                      <th className="px-3 py-2 w-[20%]">RETURNED ITEMS</th>
                      <th className="px-3 py-2 text-right w-[11%]">VALUE</th>
                      <th className="px-3 py-2 text-center w-[11%]">SETTLEMENT</th>
                      <th className="px-3 py-2 text-center w-[5%]">STOCK</th>
                      <th className="px-3 py-2 text-center w-[5%]">STATUS</th>
                      <th className="px-3 py-2 text-center w-[7%]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {paginatedCustomerRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50/90 transition-colors duration-150"
                      >
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-slate-900 block">{rec.return_code}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{rec.date}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-slate-900 block">{rec.customer_name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{rec.customer_phone}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-800">
                            {rec.original_invoice}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <span className="font-medium text-slate-900 block truncate">{rec.returned_items}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                          {formatCurrency(rec.total_value)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${rec.refund_type === 'Khata Credit'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.refund_type === 'Cash Refund'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-purple-100 text-purple-800'
                              }`}
                          >
                            {rec.refund_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord({ record: rec, type: 'customer' })}
                            title={`Stock Condition: ${rec.condition} (Click for full audit details)`}
                            className={`p-1.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition ${rec.condition === 'Restocked'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-rose-100 text-rose-700 border border-rose-300'
                              }`}
                          >
                            {rec.condition === 'Restocked' ? <RestockPackageIcon className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700 font-bold" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord({ record: rec, type: 'customer' })}
                            title={`Status: ${rec.status} (Click for full status & history)`}
                            className={`p-1.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition ${rec.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                              }`}
                          >
                            {rec.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 font-bold" /> : <Clock className="w-4 h-4 text-amber-600 font-bold" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => window.print()}
                              title="Print Receipt"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer active:scale-95 transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id, 'customer', rec.return_code)}
                              title="Delete"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer active:scale-95 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* SUPPLIER RETURNS TABLE */}
            {activeTab === 'supplier' && (
              <div className="w-full overflow-hidden no-scrollbar">
                <table className="w-full text-left text-xs font-sans table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/60 text-[10.5px] uppercase font-bold text-slate-500 font-mono">
                      <th className="px-3 py-2.5 w-[14%]">DEBIT CODE & DATE</th>
                      <th className="px-3 py-2.5 w-[18%]">SUPPLIER / WHOLESALER</th>
                      <th className="px-3 py-2.5 w-[12%]">PURCHASE BILL</th>
                      <th className="px-3 py-2.5 w-[20%]">ITEMS RETURNED</th>
                      <th className="px-3 py-2.5 text-right w-[11%]">TOTAL VALUE</th>
                      <th className="px-3 py-2.5 text-center w-[11%]">SETTLEMENT STATUS</th>
                      <th className="px-3 py-2.5 w-[11%]">REASON</th>
                      <th className="px-3 py-2.5 text-center w-[5%]">STATUS</th>
                      <th className="px-3 py-2.5 text-center w-[8%]">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {paginatedSupplierRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/90 transition-colors duration-150">
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-bold text-slate-900 block">{rec.return_code}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{rec.date}</span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-900">{rec.supplier_name}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-800 font-bold">{rec.purchase_bill}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 max-w-xs truncate">{rec.items_returned}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-[#1b3830] text-sm">
                          {formatCurrency(rec.total_value)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold inline-block">
                            {rec.settlement_status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-medium">{rec.reason}</td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord({ record: rec, type: 'supplier' })}
                            title={`Status: ${rec.status} (Click for full audit details & reason)`}
                            className={`p-1.5 rounded-full inline-flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition ${rec.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                              }`}
                          >
                            {rec.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Clock className="w-3.5 h-3.5 text-amber-600 font-bold" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => window.print()}
                              title="Download Debit Note"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer active:scale-95 transition"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(rec.id, 'supplier', rec.return_code)}
                              title="Delete"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer active:scale-95 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Bar */}
            {currentTotal > PAGE_SIZE && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between font-sans">
                <span className="text-xs text-slate-500 font-medium font-mono">
                  Page {currentPage} of {Math.ceil(currentTotal / PAGE_SIZE)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(currentTotal / PAGE_SIZE)}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         RIGHT-SIDE SLIDE-IN WORKFLOW DRAWER (scroll container se bahar)
         ═══════════════════════════════════════════════════════════════════ */}
      {isWorkflowOpen && (
        <div
          onClick={() => setIsWorkflowOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 opacity-100"
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-[420px] max-w-[95vw] bg-white shadow-2xl flex flex-col font-sans transition-all duration-300 ease-out border-l border-slate-200 ${isWorkflowOpen ? 'translate-x-0 opacity-100 shadow-2xl' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
      >
        {/* Workflow Panel Top Header */}
        <div className="px-4 py-3 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="" />
            <h3 className="font-bold text-sm tracking-wide">New Return Workflow</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWorkflowOpen(false)}
              className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow Type Toggle Switcher */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setWorkflowTab('customer')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-center ${workflowTab === 'customer'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Customer Return
          </button>
          <button
            type="button"
            onClick={() => setWorkflowTab('supplier')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-center ${workflowTab === 'supplier'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            Supplier Return
          </button>
        </div>

        {/* Workflow Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {workflowTab === 'customer' ? (
            <>
              {/* 1. FETCH ORIGINAL SALE BILL */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  1.SALE BILL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wfInvoiceInput}
                    onChange={(e) => setWfInvoiceInput(e.target.value)}
                    placeholder="Enter Invoice # (e.g., #INV-8840)..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#1b3830] transition"
                  />
                  <button
                    onClick={handleFetchBill}
                    disabled={wfIsFetching}
                    className="px-4 py-2 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-all"
                  >
                    {wfIsFetching ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>

                {/* Fetched Bill Detail Box */}
                {wfFetchedInvoice && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium space-y-1 animate-in fade-in duration-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-bold text-slate-900">{wfFetchedInvoice.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Total:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rs. {(wfFetchedInvoice.total_amount || 18500).toLocaleString()} <span className="text-[10px] text-emerald-600 font-sans">(Paid in Full)</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SELECT ITEM(S) TO RETURN */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  2. SELECT ITEM(S) TO RETURN
                </label>

                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                  {wfFetchedInvoice?.items?.map((itm: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-xs hover:bg-slate-50 p-1.5 rounded-lg transition">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itm.selected}
                          onChange={(e) => {
                            const copy = [...wfFetchedInvoice.items];
                            copy[idx].selected = e.target.checked;
                            setWfFetchedInvoice({ ...wfFetchedInvoice, items: copy });
                          }}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{itm.name}</span>
                          <span className="text-[10.5px] text-slate-500 font-mono">
                            Qty: {itm.qty} Suits @ Rs. {itm.price.toLocaleString()}
                          </span>
                        </div>
                      </label>
                      <div className="text-right font-mono">
                        <span className="font-bold text-slate-900 block">Rs. {(itm.qty * itm.price).toLocaleString()}</span>
                        <span className="text-[10px] text-emerald-600 font-sans">Original price applied</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. PHYSICAL CONDITION & RESTOCK */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  3. PHYSICAL CONDITION & RESTOCK
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWfCondition('RESTOCKABLE')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 active:scale-95 ${wfCondition === 'RESTOCKABLE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Restockable
                    </div>
                    <span className="text-[10.5px] text-slate-500 block mt-0.5">+2 into Main Stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWfCondition('DAMAGED')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 active:scale-95 ${wfCondition === 'DAMAGED'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Damaged
                    </div>
                    <span className="text-[10.5px] text-slate-500 block mt-0.5">Claim Box Bin #4</span>
                  </button>
                </div>
              </div>

              {/* 4. REFUND / KHATA SETTLEMENT */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block">
                  4. REFUND / KHATA SETTLEMENT
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWfSettlement('CASH')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 active:scale-95 text-center ${wfSettlement === 'CASH'
                      ? 'bg-[#1b3830] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setWfSettlement('KHATA_CREDIT')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 active:scale-95 text-center ${wfSettlement === 'KHATA_CREDIT'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    Khata Credit
                  </button>

                  <button
                    type="button"
                    onClick={() => setWfSettlement('EXCHANGE')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 active:scale-95 text-center ${wfSettlement === 'EXCHANGE'
                      ? 'bg-[#1b3830] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                  >
                    Exchange
                  </button>
                </div>

                {/* System Auto Sync Notice Box */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-bounce-once" />
                  <div>
                    <strong>Automatic System Sync:</strong> {wfFetchedInvoice?.customer_name || 'Customer'}'s ledger Khata will be credited with <strong>Rs. {wfSelectedReturnValue.toLocaleString()}</strong> and 2 suits will be instantly replenished to warehouse inventory.
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* SUPPLIER WORKFLOW FORM */
            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block mb-1">
                  WHOLESALER / SUPPLIER NAME
                </label>
                <input
                  type="text"
                  value={wfSupplierName}
                  onChange={(e) => setWfSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block mb-1">
                  ORIGINAL PURCHASE BILL #
                </label>
                <input
                  type="text"
                  value={wfPurchaseBill}
                  onChange={(e) => setWfPurchaseBill(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block mb-1">
                  RETURNED DEFECT STOCK DETAILS
                </label>
                <input
                  type="text"
                  value={wfReturnedItemsText}
                  onChange={(e) => setWfReturnedItemsText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider font-mono block mb-1">
                  RETURN VALUE (RS)
                </label>
                <input
                  type="number"
                  value={wfSupplierReturnValue}
                  onChange={(e) => setWfSupplierReturnValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:bg-white transition"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Automatic Ledger & Stock Sync:</strong> Supplier total payable will decrease by <strong>Rs. {wfSupplierReturnValue.toLocaleString()}</strong> via instant Debit Note entry.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workflow Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
          <button
            onClick={handleProcessWorkflow}
            className="w-full py-2.5 bg-[#1b3830] hover:bg-[#142e27] active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Process Return & Print Slip</span>
          </button>
          <button
            onClick={() => setIsWorkflowOpen(false)}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer py-1"
          >
            Cancel Workflow
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         INTERACTIVE RETURN RECORD FULL STATUS & AUDIT DETAIL MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      {selectedDetailRecord && (
        <div
          onClick={() => setSelectedDetailRecord(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-4 bg-[#1b3830] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm leading-none">{selectedDetailRecord.record.return_code} Status & Audit Details</h3>
                  <p className="text-[11px] text-emerald-200 mt-0.5">{selectedDetailRecord.record.date}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Client / Wholesaler</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {selectedDetailRecord.type === 'customer'
                      ? selectedDetailRecord.record.customer_name
                      : selectedDetailRecord.record.supplier_name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {selectedDetailRecord.record.customer_phone || selectedDetailRecord.record.purchase_bill}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Ref Invoice / Bill #</span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {selectedDetailRecord.record.original_invoice || selectedDetailRecord.record.purchase_bill}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Returned Items Breakdown</span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900">
                  {selectedDetailRecord.record.returned_items || selectedDetailRecord.record.items_returned}
                </div>
              </div>

              {/* Status & Condition Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase font-mono block">Settlement Method</span>
                  <span className="font-bold text-emerald-900 text-xs">
                    {selectedDetailRecord.record.refund_type || selectedDetailRecord.record.settlement_status}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-800 uppercase font-mono block">Processing Status</span>
                  <span className="font-bold text-blue-900 text-xs flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {selectedDetailRecord.record.status}
                  </span>
                </div>
              </div>

              {/* Reason for Return */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Reason for Return / Defect Note</span>
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 font-medium">
                  {selectedDetailRecord.record.reason || 'Standard Customer Return / Color Shade Mismatch'}
                </div>
              </div>

              {/* Stock Action */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-slate-600 font-medium text-xs">Stock Condition Action:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  {selectedDetailRecord.record.condition === 'Restocked' ? (
                    <>
                      <RestockPackageIcon className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Restocked into Main Inventory</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span className="text-rose-700">Damaged (Moved to Defect Bin #4)</span>
                    </>
                  )}
                </span>
              </div>

              {/* Total Value */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
                <span className="text-xs text-slate-300 font-sans">Total Return Refund Value:</span>
                <span className="text-base font-bold text-emerald-400">{formatCurrency(selectedDetailRecord.record.total_value)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="px-4 py-1.5 bg-[#1b3830] text-white font-bold text-xs rounded-xl hover:bg-[#142e27] transition cursor-pointer"
              >
                Close Status Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         INTERACTIVE DELETE CONFIRMATION MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      {deleteConfirmTarget && (
        <DeleteConfirmModal
          productName={`Return Record ${deleteConfirmTarget.code}`}
          onConfirm={confirmDeleteRecord}
          onCancel={() => setDeleteConfirmTarget(null)}
        />
      )}
    </>
  );
}