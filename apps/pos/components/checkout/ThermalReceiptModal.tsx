'use client';

import React from 'react';
import { Printer, Share2, X, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ThermalReceiptModalProps {
  receiptData: {
    invoice_number: string;
    items: any[];
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    cash_paid: number;
    cash_change: number;
    payment_mode: string;
    customer_name?: string;
    customer_phone?: string;
  };
  onClose: () => void;
}

export default function ThermalReceiptModal({ receiptData, onClose }: ThermalReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = receiptData.customer_phone ? receiptData.customer_phone.replace(/[^0-9]/g, '') : '';
    const text = `*Bilal Cloth & Silk Center*\nInvoice: ${receiptData.invoice_number}\nGrand Total: ${formatCurrency(receiptData.grand_total)}\nPayment Mode: ${receiptData.payment_mode}\nThank you for shopping with us!`;
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Top Actions */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Checkout Completed Successfully
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt (80mm Width format) */}
        <div className="p-5 overflow-y-auto flex-1 font-mono text-slate-900 text-xs bg-white print:p-0 print:m-0" id="receipt-print-area">
          {/* Header */}
          <div className="flex flex-col items-center text-center pb-3 border-b border-dashed border-slate-300">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-10 w-auto object-contain mb-1.5"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <h2 className="font-bold text-sm text-slate-900 uppercase">Bilal Cloth & Silk Center</h2>
            <p className="text-[10px] text-slate-600 leading-tight">Main Bazar Railway Road, Narowal</p>
            <p className="text-[10px] text-slate-600">Ph: 0301-0606643</p>
          </div>

          {/* Invoice Info */}
          <div className="py-2.5 border-b border-dashed border-slate-300 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between font-bold">
              <span>Invoice #:</span>
              <span>{receiptData.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {receiptData.customer_phone && (
              <div className="flex justify-between">
                <span>Client:</span>
                <span>{receiptData.customer_name || receiptData.customer_phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="font-bold uppercase">{receiptData.payment_mode}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-1 font-sans font-medium text-slate-900 leading-tight">
                      {item.name}
                    </td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{item.price}</td>
                    <td className="py-1 text-right font-bold">{item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2.5 border-b border-dashed border-slate-300 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            {receiptData.discount_total > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-{formatCurrency(receiptData.discount_total)}</span>
              </div>
            )}
            {receiptData.tax_total > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span>+{formatCurrency(receiptData.tax_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
              <span>GRAND TOTAL:</span>
              <span>{formatCurrency(receiptData.grand_total)}</span>
            </div>
            {receiptData.cash_paid > 0 && (
              <>
                <div className="flex justify-between pt-1">
                  <span>Cash Paid:</span>
                  <span>{formatCurrency(receiptData.cash_paid)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Change Due:</span>
                  <span>{formatCurrency(receiptData.cash_change)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="pt-3 text-center text-[10px] text-slate-500 flex flex-col items-center">
            <span>Thank you for your visit!</span>
            <span>Items once sold can be exchanged within 7 days with receipt.</span>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Thermal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
