'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, RefreshCw, Printer, Trash2, Receipt, ArrowRight, Eye, Download, FileText } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { fetchBillingHistory } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import ThermalReceiptModal from './ThermalReceiptModal';

/* ────────────────── Payment Mode Badge Color Map ────────────────── */
const PAYMENT_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CASH: { bg: 'bg-slate-700', text: 'text-white', label: 'CASH' },
  'POS CARD': { bg: 'bg-blue-600', text: 'text-white', label: 'POS CARD' },
  CARD: { bg: 'bg-blue-600', text: 'text-white', label: 'POS CARD' },
  'NAQDI / QR': { bg: 'bg-emerald-600', text: 'text-white', label: 'NAQDI / QR' },
  QR: { bg: 'bg-emerald-600', text: 'text-white', label: 'NAQDI / QR' },
  NAQDI: { bg: 'bg-emerald-600', text: 'text-white', label: 'NAQDI / QR' },
  CREDIT: { bg: 'bg-amber-500', text: 'text-white', label: 'CREDIT' },
};

function getPaymentBadge(mode: string): { bg: string; text: string; label: string } {
  const key = (mode || 'CASH').toUpperCase().trim();
  const fallback = { bg: 'bg-slate-700', text: 'text-white', label: 'CASH' };
  return PAYMENT_BADGE[key] ?? fallback;
}

/* ──────────────────────── Parse Items JSON ──────────────────────── */
function parseItems(jsonStr: string | any[]): any[] {
  if (!jsonStr) return [];
  if (Array.isArray(jsonStr)) return jsonStr;
  try { return JSON.parse(jsonStr); } catch { return []; }
}

function buildItemsSummary(jsonStr: string | any[]): string {
  const items = parseItems(jsonStr);
  if (items.length === 0) return '';
  const totalQty = items.reduce((s: number, i: any) => s + (i.quantity || 1), 0);
  const names = items.slice(0, 3).map((i: any) => {
    const name = i.name || i.product_name || 'Item';
    const qty = i.quantity || 1;
    return qty > 1 ? `${name} (x${qty})` : name;
  });
  const suffix = items.length > 3 ? `, +${items.length - 3} more` : '';
  return `${totalQty} Items: ${names.join(', ')}${suffix}`;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Right-side Slide-In Drawer
   ═══════════════════════════════════════════════════════════════════ */

export default function HoldOrdersModal({ onClose }: { onClose: () => void }) {
  const { heldBills, restoreHeldOrder, deleteHeldOrder } = useCartStore();

  // Animation state
  const [slideIn, setSlideIn] = useState(false);

  // Data
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectReceiptData, setInspectReceiptData] = useState<any | null>(null);

  // Load on mount + trigger slide-in
  useEffect(() => {
    requestAnimationFrame(() => setSlideIn(true));
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBillingHistory();
      if (Array.isArray(data)) setInvoices(data);
    } catch (err) {
      console.error('Error fetching bill history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setSlideIn(false);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  /* ── Filter logic ── */
  const filtered = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_phone?.toLowerCase().includes(q) ||
      inv.cashier_name?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q)
    );
  });

  /* ── Totals for shift summary ── */
  const shiftTotal = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);

  /* ── Open receipt viewer ── */
  const openReceipt = (inv: any) => {
    const items = parseItems(inv.item_details_json);
    setInspectReceiptData({
      invoice_number: inv.invoice_number,
      items: items.map((i: any) => ({
        id: i.id || 'itm',
        name: i.name || i.product_name || 'Item',
        quantity: i.quantity || 1,
        price: i.price || 0,
        sku: i.sku || '',
      })),
      subtotal: inv.total_amount || 0,
      discount_total: inv.discount || 0,
      grand_total: inv.total_amount || 0,
      tendered_amount: inv.total_amount || 0,
      change_due: 0,
      payment_mode: inv.payment_mode || 'CASH',
      cashier_name: inv.cashier_name || 'Admin',
      billing_date: inv.created_at
        ? new Date(inv.created_at).toLocaleString()
        : new Date().toLocaleString(),
    });
  };

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${slideIn ? 'opacity-100' : 'opacity-0'
          }`}
      />

      {/* Slide-in Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[380px] max-w-[92vw] bg-white shadow-2xl flex flex-col font-sans transition-transform duration-300 ease-out ${slideIn ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* ─── Header ─── */}
        <div className="px-4 py-3 bg-[#1b3830] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800/80 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm leading-tight">Bill History & Invoices</h3>

              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Search Bar ─── */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* ─── Shift Sales Summary ─── */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span className=" font-bold">
          
            {invoices.length} Bills Today
          </span>

        </div>

        {/* ─── Invoice Cards List (scrollable) ─── */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs">Loading bill history...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              {searchQuery ? 'No matching invoices found.' : 'No sales invoices yet.'}
            </div>
          ) : (
            filtered.map((inv) => {
              const payBadge = getPaymentBadge(inv.payment_mode);
              const itemsSummary = buildItemsSummary(inv.item_details_json);
              const time = inv.created_at
                ? new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div key={inv.id || inv.invoice_number} className="px-4 py-3 hover:bg-slate-50/80 transition">
                  {/* Row 1: Invoice # + PAID badge + Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 font-mono">
                        #{inv.invoice_number}
                      </span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-semibold rounded uppercase tracking-wide">
                        PAID
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 font-mono">
                      {formatCurrency(inv.total_amount || 0)}
                    </span>
                  </div>

                  {/* Row 2: Time + Cashier + Payment Mode + Customer */}
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      {time && <span>{time}</span>}
                      {time && <span>•</span>}
                      <span>Cashier: {inv.cashier_name || 'Admin'}</span>
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${payBadge.bg} ${payBadge.text}`}
                      >
                        {payBadge.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 italic truncate max-w-[100px]">
                      {inv.customer_name || inv.customer_phone || 'Walk-in Client'}
                    </span>
                  </div>

                  {/* Row 3: Items summary */}
                  {itemsSummary && (
                    <p className="mt-1.5 text-[11px] text-slate-400 truncate">
                      {itemsSummary}
                    </p>
                  )}

                  {/* Row 4: Action Buttons */}
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button
                      onClick={() => openReceipt(inv)}
                      className="px-2.5 py-1 border border-slate-200 bg-white text-slate-700 rounded-lg text-[11px] font-medium hover:bg-slate-50 cursor-pointer flex items-center gap-1 transition"
                    >
                      <Printer className="w-3 h-3" /> Reprint
                    </button>
                    <button
                      onClick={() => openReceipt(inv)}
                      className="px-2.5 py-1 bg-[#1b3830] text-white rounded-lg text-[11px] font-medium hover:bg-[#142e27] cursor-pointer flex items-center gap-1 transition"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Footer Buttons ─── */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
          <button className="flex-1 px-3 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5 transition">
            <Download className="w-3.5 h-3.5" /> Export Day Report
          </button>
          <button className="flex-1 px-3 py-2 bg-[#1b3830] text-white rounded-xl text-xs font-medium hover:bg-[#142e27] cursor-pointer flex items-center justify-center gap-1.5 transition">
            <FileText className="w-3.5 h-3.5" /> Print Summary
          </button>
        </div>
      </div>

      {/* Thermal Receipt Inspector Modal */}
      {inspectReceiptData && (
        <ThermalReceiptModal
          receiptData={inspectReceiptData}
          onClose={() => setInspectReceiptData(null)}
        />
      )}
    </>
  );
}
