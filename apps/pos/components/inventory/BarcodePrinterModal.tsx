'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import BarcodeTemplateControls from './BarcodeTemplateControls';
import { generateStickerPrintHtml } from './BarcodePrintStyles';
import bwipjs from 'bwip-js';

export default function BarcodePrinterModal({ product, onClose }: { product: any; onClose: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [shopName, setShopName] = useState('Bilal Cloth & Silk Center Narowal');
  const [productName, setProductName] = useState(product?.name || 'Fabric Item');
  const [barcodeVal, setBarcodeVal] = useState(product?.barcode || product?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [priceVal, setPriceVal] = useState<number>(Number(product?.price) || 6500);

  const [labelWidthMm, setLabelWidthMm] = useState(50);
  const [labelHeightMm, setLabelHeightMm] = useState(25);
  const [barcodeWidthMm, setBarcodeWidthMm] = useState(44);
  const [barcodeHeightMm, setBarcodeHeightMm] = useState(9);
  const [copiesCount, setCopiesCount] = useState(1);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 250);
  };

  useEffect(() => {
    if (previewCanvasRef.current && barcodeVal) {
      try {
        bwipjs.toCanvas(previewCanvasRef.current, {
          bcid: 'code128', text: barcodeVal, scale: 2.5, height: 8,
          includetext: false, paddingwidth: 1, backgroundcolor: 'FFFFFF', barcolor: '000000',
        });
      } catch (err) {
        console.error('bwipjs preview error:', err);
      }
    }
  }, [barcodeVal, barcodeWidthMm, barcodeHeightMm]);

  const handlePrint = () => {
    const tempCanvas = document.createElement('canvas');
    bwipjs.toCanvas(tempCanvas, {
      bcid: 'code128', text: barcodeVal, scale: 10, height: 22,
      includetext: false, paddingwidth: 4, paddingheight: 1, backgroundcolor: 'FFFFFF', barcolor: '000000',
    });
    const html = generateStickerPrintHtml({
      labelWidthMm, labelHeightMm, barcodeWidthMm, barcodeHeightMm,
      shopName, showShopName: true, productName: productName || 'Fabric Item',
      barcodeValue: barcodeVal, showPrice: true, priceFormatted: `RS: ${priceVal.toLocaleString()}`,
      shopFontSizePt: 6, titleFontSizePt: 7, barcodeTextFontSizePt: 6.5, priceFontSizePt: 7.5,
      canvasDataUrl: tempCanvas.toDataURL('image/png'), copiesCount
    });
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open(); printWin.document.write(html); printWin.document.close();
    }
  };

  return (
    <div
      onClick={handleAnimatedClose}
      className={`fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans transition-opacity duration-300 ${
        isOpen && !isClosing ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isOpen && !isClosing ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'
        }`}
      >
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-sm">
            Barcode Sticker Designer & Printer
          </h3>
          <button onClick={handleAnimatedClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Live Sticker Preview Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
            <div
              className="bg-white p-2 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center justify-between gap-0.5 overflow-hidden font-sans"
              style={{ width: `${labelWidthMm * 4}px`, minHeight: `${labelHeightMm * 4}px` }}
            >
              <span className="font-bold text-[10px] text-slate-900 text-center line-clamp-1 w-full">{shopName}</span>
              <span className="font-extrabold text-[11px] text-slate-900 text-center line-clamp-1 w-full">{productName}</span>
              <canvas ref={previewCanvasRef} className="max-w-full h-8 object-contain my-0.5" />
              <div className="w-full flex items-center justify-between px-1">
                <span className="font-mono text-[9.5px] font-black text-slate-900">{barcodeVal}</span>
                <span className="font-mono font-black text-[10.5px] text-[#1b3830]">RS: {priceVal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <BarcodeTemplateControls
            shopName={shopName} setShopName={setShopName}
            productName={productName} setProductName={setProductName}
            barcodeVal={barcodeVal} setBarcodeVal={setBarcodeVal}
            priceVal={priceVal} setPriceVal={setPriceVal}
            labelWidthMm={labelWidthMm} setLabelWidthMm={setLabelWidthMm}
            labelHeightMm={labelHeightMm} setLabelHeightMm={setLabelHeightMm}
            barcodeWidthMm={barcodeWidthMm} setBarcodeWidthMm={setBarcodeWidthMm}
            barcodeHeightMm={barcodeHeightMm} setBarcodeHeightMm={setBarcodeHeightMm}
          />
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-700">Copies:</span>
            <input type="number" min="1" max="500" className="w-16 h-9 text-center rounded-xl border border-slate-300 font-mono font-bold text-xs bg-white" value={copiesCount} onChange={(e) => setCopiesCount(Math.max(1, Number(e.target.value)))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAnimatedClose} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition">Close</button>
            <button onClick={handlePrint} className="px-6 py-2.5 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] text-white rounded-xl font-extrabold text-xs cursor-pointer shadow-md transition-all">
              Print {copiesCount} Sticker(s)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}