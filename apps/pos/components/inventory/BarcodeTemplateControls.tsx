'use client';

import React from 'react';

interface BarcodeTemplateControlsProps {
  templateName: string; setTemplateName: (v: string) => void;
  shopName: string; setShopName: (v: string) => void;
  labelWidthMm: number; setLabelWidthMm: (v: number) => void;
  labelHeightMm: number; setLabelHeightMm: (v: number) => void;
  barcodeWidthMm: number; setBarcodeWidthMm: (v: number) => void;
  barcodeHeightMm: number; setBarcodeHeightMm: (v: number) => void;
  shopFontSizePt: number; setShopFontSizePt: (v: number) => void;
  titleFontSizePt: number; setTitleFontSizePt: (v: number) => void;
  barcodeTextFontSizePt: number; setBarcodeTextFontSizePt: (v: number) => void;
  priceFontSizePt: number; setPriceFontSizePt: (v: number) => void;
}

export default function BarcodeTemplateControls(props: BarcodeTemplateControlsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
      <div>
        <label className="block text-slate-600 font-bold mb-1">Preset Name</label>
        <input type="text" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.templateName} onChange={(e) => props.setTemplateName(e.target.value)} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Shop Title</label>
        <input type="text" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.shopName} onChange={(e) => props.setShopName(e.target.value)} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Width (mm)</label>
        <input type="number" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.labelWidthMm} onChange={(e) => props.setLabelWidthMm(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Height (mm)</label>
        <input type="number" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.labelHeightMm} onChange={(e) => props.setLabelHeightMm(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Barcode W (mm)</label>
        <input type="number" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold text-indigo-600" value={props.barcodeWidthMm} onChange={(e) => props.setBarcodeWidthMm(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Barcode H (mm)</label>
        <input type="number" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold text-indigo-600" value={props.barcodeHeightMm} onChange={(e) => props.setBarcodeHeightMm(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Shop Font (pt)</label>
        <input type="number" step="0.5" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.shopFontSizePt} onChange={(e) => props.setShopFontSizePt(Number(e.target.value))} />
      </div>
      <div>
        <label className="block text-slate-600 font-bold mb-1">Price Font (pt)</label>
        <input type="number" step="0.5" className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-semibold" value={props.priceFontSizePt} onChange={(e) => props.setPriceFontSizePt(Number(e.target.value))} />
      </div>
    </div>
  );
}
