'use client';

import React from 'react';

interface BarcodeTemplateControlsProps {
  shopName: string; setShopName: (v: string) => void;
  productName: string; setProductName: (v: string) => void;
  barcodeVal: string; setBarcodeVal: (v: string) => void;
  priceVal: number; setPriceVal: (v: number) => void;
  labelWidthMm: number; setLabelWidthMm: (v: number) => void;
  labelHeightMm: number; setLabelHeightMm: (v: number) => void;
  barcodeWidthMm: number; setBarcodeWidthMm: (v: number) => void;
  barcodeHeightMm: number; setBarcodeHeightMm: (v: number) => void;
}

export default function BarcodeTemplateControls(props: BarcodeTemplateControlsProps) {
  return (
    <div className="flex flex-col gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 text-xs font-sans">
      <div className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-200 pb-1.5">
        Sticker Content & Print Dimensions (Editable)
      </div>

      {/* Row 1: Editable Text Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-slate-700 font-bold mb-1">Shop Title</label>
          <input type="text" className="w-full h-8 px-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-[#1b3830]" value={props.shopName} onChange={(e) => props.setShopName(e.target.value)} />
        </div>
        <div>
          <label className="block text-slate-700 font-bold mb-1">Product Title</label>
          <input type="text" className="w-full h-8 px-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-[#1b3830]" value={props.productName} onChange={(e) => props.setProductName(e.target.value)} />
        </div>
        <div>
          <label className="block text-slate-700 font-bold mb-1">SKU / Barcode Code</label>
          <input type="text" className="w-full h-8 px-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1b3830]" value={props.barcodeVal} onChange={(e) => props.setBarcodeVal(e.target.value)} />
        </div>
        <div>
          <label className="block text-slate-700 font-bold mb-1">Retail Price (PKR)</label>
          <input type="number" className="w-full h-8 px-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1b3830]" value={props.priceVal} onChange={(e) => props.setPriceVal(Number(e.target.value) || 0)} />
        </div>
      </div>

      {/* Row 2: Editable Label & Barcode Millimeter Dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70">
        <div>
          <label className="block text-slate-600 font-bold mb-0.5">Label Width (mm)</label>
          <input type="number" className="w-full h-8 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800" value={props.labelWidthMm} onChange={(e) => props.setLabelWidthMm(Number(e.target.value) || 50)} />
        </div>
        <div>
          <label className="block text-slate-600 font-bold mb-0.5">Label Height (mm)</label>
          <input type="number" className="w-full h-8 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800" value={props.labelHeightMm} onChange={(e) => props.setLabelHeightMm(Number(e.target.value) || 25)} />
        </div>
        <div>
          <label className="block text-slate-600 font-bold mb-0.5">Barcode W (mm)</label>
          <input type="number" className="w-full h-8 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800" value={props.barcodeWidthMm} onChange={(e) => props.setBarcodeWidthMm(Number(e.target.value) || 44)} />
        </div>
        <div>
          <label className="block text-slate-600 font-bold mb-0.5">Barcode H (mm)</label>
          <input type="number" className="w-full h-8 px-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-slate-800" value={props.barcodeHeightMm} onChange={(e) => props.setBarcodeHeightMm(Number(e.target.value) || 9)} />
        </div>
      </div>
    </div>
  );
}
