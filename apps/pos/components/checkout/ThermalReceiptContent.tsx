'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface ThermalReceiptContentProps {
  receiptData?: any;
}

export default function ThermalReceiptContent({ receiptData }: ThermalReceiptContentProps) {
  const data = receiptData || {};
  const {
    invoice_number = `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    items = [],
    subtotal = 0,
    discount_total = 0,
    grand_total = 0,
    cash_paid = 0,
    cash_change = 0,
    payment_mode = 'CASH',
    customer_name = '',
    cashier_name = 'Admin'
  } = data;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const displayCustomer = customer_name || 'Walk-in Customer';

  return (
    <div id="receipt-print-area" className="w-[300px] max-w-full bg-white p-4 font-mono text-[11.5px] leading-snug text-slate-900 border border-slate-200 shadow-md mx-auto my-1 rounded-xl overflow-hidden select-none">
      {/* Header */}
      <div className="text-center pb-2.5 border-b border-dashed border-slate-400 space-y-0.5">
        <h2 className="font-bold text-[13px] text-slate-900 font-sans tracking-tight uppercase">BILAL CLOTH & SILK CENTER</h2>
        <p className="text-[10px] text-slate-600 font-medium">Main Bazar Railway Road, Narowal</p>
        <p className="text-[10px] text-slate-800 font-bold">Ph: 0301-0606643</p>
      </div>

      {/* Meta Info */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
        <div className="flex justify-between"><span className="text-slate-600 font-medium">Inv #:</span><span className="font-bold text-slate-900">{invoice_number}</span></div>
        <div className="flex justify-between"><span className="text-slate-600 font-medium">Date:</span><span className="text-slate-800 font-medium">{dateStr} {timeStr}</span></div>
        <div className="flex justify-between"><span className="text-slate-600 font-medium">Cashier:</span><span className="text-slate-800 font-medium">{cashier_name}</span></div>
        <div className="flex justify-between"><span className="text-slate-600 font-medium">Customer:</span><span className="text-slate-800 font-medium">{displayCustomer}</span></div>
      </div>

      {/* Items Table */}
      <div className="py-2.5 border-b border-dashed border-slate-400">
        <table className="w-full text-left text-[11px] border-collapse font-mono" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-slate-400 text-[10.5px] uppercase text-slate-800">
              <th className="py-1 font-bold text-left" style={{ width: '50%' }}>ITEM</th>
              <th className="py-1 text-center font-bold" style={{ width: '18%' }}>QTY</th>
              <th className="py-1 text-right font-bold" style={{ width: '32%' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => {
              const itemTotal = it.line_total || (it.price || it.unit_price || 0) * (it.quantity || 1);
              return (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="py-1 pr-1 font-medium text-slate-900 truncate font-sans" style={{ width: '50%' }}>
                    {it.product_name || it.name}
                  </td>
                  <td className="py-1 text-center font-medium text-slate-800" style={{ width: '18%' }}>
                    {it.quantity || 1}
                  </td>
                  <td className="py-1 text-right font-bold text-slate-900" style={{ width: '32%' }}>
                    {formatCurrency(itemTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1.5">
        <div className="flex justify-between text-slate-700 font-medium">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal || grand_total)}</span>
        </div>
        {discount_total > 0 && (
          <div className="flex justify-between text-emerald-700 font-bold">
            <span>Discount:</span>
            <span>-{formatCurrency(discount_total)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-[12px] text-slate-900 py-0.5">
          <span>Net Total:</span>
          <span>{formatCurrency(grand_total)}</span>
        </div>
        <div className="flex justify-between text-[11px] pt-1">
          <span className="text-slate-600 font-medium">Payment Mode:</span>
          <span className="font-bold text-slate-900">{payment_mode}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-slate-600 font-medium">Cash Paid:</span>
          <span className="text-slate-900 font-medium">{formatCurrency(cash_paid || grand_total)}</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold text-slate-900">
          <span>Change Due:</span>
          <span>{formatCurrency(cash_change)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2.5 text-center space-y-1 font-sans">
        <p className="font-bold text-[11px] text-slate-900">Thank you for shopping at Bilal Cloth!</p>
        <p className="text-[9.5px] text-slate-500 font-medium">No refund without original invoice within 7 days.</p>
      </div>
    </div>
  );
}
