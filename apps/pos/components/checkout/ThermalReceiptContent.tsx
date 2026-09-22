'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface ThermalReceiptContentProps {
  receiptData: any;
}

export default function ThermalReceiptContent({ receiptData }: ThermalReceiptContentProps) {
  const {
    invoice_number, items, subtotal, discount_total, tax_total, grand_total,
    cash_paid, cash_change, payment_mode, customer_name, customer_phone, cashier_name
  } = receiptData;

  return (
    <div id="receipt-print-area" className="w-[80mm] bg-white p-3 font-mono text-[11px] leading-tight text-slate-900 border border-slate-200 shadow-sm mx-auto my-2">
      <div className="text-center pb-2 border-b border-dashed border-slate-400">
        <h2 className="font-bold text-sm tracking-tight text-slate-900 font-sans">BILAL CLOTH & SILK CENTER</h2>
        <p className="text-[10px] text-slate-600">Main Bazar Railway Road, Narowal</p>
        <p className="text-[10px] text-slate-600">Ph: 0301-0606643</p>
      </div>

      <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
        <div className="flex justify-between"><span>Inv #:</span><span className="font-bold">{invoice_number}</span></div>
        <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
        <div className="flex justify-between"><span>Cashier:</span><span>{cashier_name || 'Tariq Cashier'}</span></div>
        {customer_name && <div className="flex justify-between"><span>Cust:</span><span>{customer_name}</span></div>}
      </div>

      <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
        <div className="grid grid-cols-12 font-bold text-[10px] pb-1 border-b border-slate-200">
          <span className="col-span-6">Item</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-4 text-right">Total</span>
        </div>
        {items.map((it: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12 text-[10.5px]">
            <span className="col-span-6 truncate font-sans font-bold">{it.product_name}</span>
            <span className="col-span-2 text-center font-bold">{it.quantity}</span>
            <span className="col-span-4 text-right font-bold">{formatCurrency(it.line_total || it.unit_price * it.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-xs">
        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div>
        {discount_total > 0 && <div className="flex justify-between text-emerald-700"><span>Discount:</span><span>-{formatCurrency(discount_total)}</span></div>}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300"><span>Net Total:</span><span>{formatCurrency(grand_total)}</span></div>
        <div className="flex justify-between text-[11px] pt-1"><span>Payment Mode:</span><span className="font-bold">{payment_mode}</span></div>
        <div className="flex justify-between text-[11px]"><span>Cash Paid:</span><span>{formatCurrency(cash_paid)}</span></div>
        <div className="flex justify-between text-[11px] font-bold"><span>Change Due:</span><span>{formatCurrency(cash_change)}</span></div>
      </div>

      <div className="pt-3 text-center text-[9.5px] text-slate-500 space-y-0.5 font-sans">
        <p className="font-bold text-slate-800">Thank you for shopping at Bilal Cloth!</p>
        <p>No refund without original invoice within 7 days.</p>
      </div>
    </div>
  );
}
