'use client';

import React from 'react';
import { Edit2, Trash2, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { type Product } from '@/lib/api';

interface InventoryTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onPrintBarcode: (product: Product) => void;
}

export default function InventoryTable({ products, onEdit, onDelete, onPrintBarcode }: InventoryTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
            <tr>
              <th className="p-3.5 pl-4">Item Details</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">SKU / Barcode</th>
              <th className="p-3.5 text-right">Price</th>
              <th className="p-3.5 text-right">Cost Price</th>
              <th className="p-3.5 text-center">Stock</th>
              <th className="p-3.5 pr-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                  No inventory items match your search.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 pl-4">
                    <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                    <div className="text-[10.5px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                      {p.category || 'General'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700 font-bold">
                    {p.sku || p.barcode || '—'}
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(p.price || 0)}
                  </td>
                  <td className="p-3.5 text-right font-mono text-slate-500">
                    {formatCurrency(p.cost_price || 0)}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${ (p.stock || 0) > 5 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {p.stock ?? 20}
                    </span>
                  </td>
                  <td className="p-3.5 pr-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onPrintBarcode(p)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Print Barcode Sticker"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
