'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Save, Copy, Check, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import BarcodeTemplateControls from './BarcodeTemplateControls';
import { generateStickerPrintHtml } from './BarcodePrintStyles';
import bwipjs from 'bwip-js';

export interface LabelTemplate {
  id: string; name: string; shopName: string; showShopName: boolean; showPrice: boolean;
  labelWidthMm: number; labelHeightMm: number; barcodeWidthMm: number; barcodeHeightMm: number;
  shopFontSizePt: number; titleFontSizePt: number; barcodeTextFontSizePt: number; priceFontSizePt: number;
}

const DEFAULT_TEMPLATES: LabelTemplate[] = [
  {
    id: 'standard_50x25', name: 'TSC Standard Label (50mm x 25mm)', shopName: 'Bilal Cloth & Silk Center Narowal',
    showShopName: true, showPrice: true, labelWidthMm: 50, labelHeightMm: 25, barcodeWidthMm: 44, barcodeHeightMm: 8.5,
    shopFontSizePt: 6, titleFontSizePt: 7, barcodeTextFontSizePt: 6, priceFontSizePt: 7.5,
  }
];

export default function BarcodePrinterModal({ product, onClose }: { product: any; onClose: () => void }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedId, setSelectedId] = useState<string>('standard_50x25');
  const [templateName, setTemplateName] = useState('TSC Standard Label (50mm x 25mm)');
  const [shopName, setShopName] = useState('Bilal Cloth & Silk Center Narowal');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [labelWidthMm, setLabelWidthMm] = useState(50);
  const [labelHeightMm, setLabelHeightMm] = useState(25);
  const [barcodeWidthMm, setBarcodeWidthMm] = useState(44);
  const [barcodeHeightMm, setBarcodeHeightMm] = useState(8.5);
  const [shopFontSizePt, setShopFontSizePt] = useState(6);
  const [titleFontSizePt, setTitleFontSizePt] = useState(7);
  const [barcodeTextFontSizePt, setBarcodeTextFontSizePt] = useState(6);
  const [priceFontSizePt, setPriceFontSizePt] = useState(7.5);
  const [copiesCount, setCopiesCount] = useState(1);
  const [copied, setCopied] = useState(false);

  const barcodeVal = product?.barcode || product?.sku || product?.id || 'OD00-1001';
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (previewCanvasRef.current && barcodeVal) {
      try {
        bwipjs.toCanvas(previewCanvasRef.current, {
          bcid: 'code128', text: barcodeVal, scale: 5, height: 14,
          includetext: false, paddingwidth: 2, backgroundcolor: 'FFFFFF', barcolor: '000000',
        });
      } catch (err) {
        console.error('bwipjs preview error:', err);
      }
    }
  }, [barcodeVal, barcodeWidthMm, barcodeHeightMm]);

  const handlePrint = () => {
    const tempCanvas = document.createElement('canvas');
    bwipjs.toCanvas(tempCanvas, {
      bcid: 'code128', text: barcodeVal, scale: 12, height: 25,
      includetext: false, paddingwidth: 8, paddingheight: 2, backgroundcolor: 'FFFFFF', barcolor: '000000',
    });
    const html = generateStickerPrintHtml({
      labelWidthMm, labelHeightMm, barcodeWidthMm, barcodeHeightMm,
      shopName, showShopName, productName: product?.name || 'Fabric Item',
      barcodeValue: barcodeVal, showPrice, priceFormatted: formatCurrency(product?.price || 0),
      shopFontSizePt, titleFontSizePt, barcodeTextFontSizePt, priceFontSizePt,
      canvasDataUrl: tempCanvas.toDataURL('image/png'), copiesCount
    });
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open(); printWin.document.write(html); printWin.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Printer className="w-4 h-4 text-indigo-600" /> Barcode Sticker Designer
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
            <div className="bg-white p-2 rounded border border-slate-300 shadow-xs flex flex-col items-center justify-between" style={{ width: `${labelWidthMm * 3}px`, height: `${labelHeightMm * 3}px` }}>
              {showShopName && <span className="font-bold text-[10px] text-slate-800">{shopName}</span>}
              <span className="font-bold text-[11px] text-slate-900 text-center">{product?.name || 'Fabric Item'}</span>
              <canvas ref={previewCanvasRef} className="max-w-full" />
              <span className="font-mono text-[9px] font-bold">{barcodeVal}</span>
              {showPrice && <span className="font-bold text-[10px] text-slate-900 self-end">{formatCurrency(product?.price || 0)}</span>}
            </div>
          </div>

          <BarcodeTemplateControls
            templateName={templateName} setTemplateName={setTemplateName}
            shopName={shopName} setShopName={setShopName}
            labelWidthMm={labelWidthMm} setLabelWidthMm={setLabelWidthMm}
            labelHeightMm={labelHeightMm} setLabelHeightMm={setLabelHeightMm}
            barcodeWidthMm={barcodeWidthMm} setBarcodeWidthMm={setBarcodeWidthMm}
            barcodeHeightMm={barcodeHeightMm} setBarcodeHeightMm={setBarcodeHeightMm}
            shopFontSizePt={shopFontSizePt} setShopFontSizePt={setShopFontSizePt}
            titleFontSizePt={titleFontSizePt} setTitleFontSizePt={setTitleFontSizePt}
            barcodeTextFontSizePt={barcodeTextFontSizePt} setBarcodeTextFontSizePt={setBarcodeTextFontSizePt}
            priceFontSizePt={priceFontSizePt} setPriceFontSizePt={setPriceFontSizePt}
          />
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-700">Copies:</span>
            <input type="number" min="1" max="500" className="w-16 h-8 text-center rounded-lg border border-slate-300 font-bold" value={copiesCount} onChange={(e) => setCopiesCount(Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer">Close</button>
            <button onClick={handlePrint} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs">
              <Printer className="w-4 h-4" /> Print {copiesCount} Sticker(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}