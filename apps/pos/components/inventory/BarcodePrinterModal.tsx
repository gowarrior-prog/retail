'use client';

import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { X, Printer, Settings2, Copy, Check } from 'lucide-react';
import { Product } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface BarcodePrinterModalProps {
  product: Product;
  onClose: () => void;
}

export default function BarcodePrinterModal({ product, onClose }: BarcodePrinterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Label Design Settings
  const [shopName, setShopName] = useState('Bilal Cloth & Silk Center Narowal');
  const [showShopName, setShowShopName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [labelSize, setLabelSize] = useState<'standard' | 'compact' | 'large'>('standard');
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const barcodeValue = product.barcode || product.sku || product.id.slice(0, 8);

  // Render Code128 Barcode onto Canvas using bwip-js
  useEffect(() => {
    if (canvasRef.current && barcodeValue) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128', // Barcode type Code128
          text: barcodeValue, // Text to encode
          scale: 3, // 3x scaling for crisp printing
          height: 12, // Bar height in mm
          includetext: false, // We render clean SKU text underneath manually
          textxalign: 'center',
        });
      } catch (err) {
        console.error('bwip-js barcode render error:', err);
      }
    }
  }, [barcodeValue, labelSize]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print barcode labels.');
      return;
    }

    const priceText = showPrice ? `RS: ${Math.round(product.price)}` : '';
    const canvasDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';

    // Generate HTML for specified number of sticker copies
    let stickersHtml = '';
    for (let i = 0; i < Math.max(1, copiesCount); i++) {
      stickersHtml += `
        <div class="sticker-card ${labelSize}">
          ${showShopName ? `<div class="shop-name">${shopName}</div>` : ''}
          <div class="product-title">${product.name}</div>
          <div class="barcode-container">
            <img src="${canvasDataUrl}" class="barcode-img" alt="barcode" />
            <div class="barcode-text">${barcodeValue}</div>
          </div>
          ${showPrice ? `<div class="price-tag">${priceText}</div>` : ''}
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode Labels - ${product.name}</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .sticker-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .sticker-card {
              border: 1px solid #000;
              border-radius: 6px;
              padding: 6px 10px;
              box-sizing: border-box;
              background: #fff;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .sticker-card.standard {
              width: 50mm;
              height: 25mm;
            }
            .sticker-card.compact {
              width: 40mm;
              height: 20mm;
            }
            .sticker-card.large {
              width: 60mm;
              height: 30mm;
            }
            .shop-name {
              font-size: 8px;
              font-weight: normal;
              text-align: center;
              line-height: 1;
              margin-bottom: 2px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .product-title {
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              line-height: 1.1;
              max-height: 22px;
              overflow: hidden;
              margin-bottom: 2px;
            }
            .barcode-container {
              text-align: center;
              margin: 1px 0;
            }
            .barcode-img {
              max-width: 90%;
              height: 18px;
              object-fit: contain;
            }
            .barcode-text {
              font-size: 9px;
              font-family: monospace;
              font-weight: bold;
              text-align: center;
              letter-spacing: 0.5px;
            }
            .price-tag {
              font-size: 13px;
              font-weight: 900;
              text-align: right;
              line-height: 1;
              margin-top: 1px;
            }
          </style>
        </head>
        <body>
          <div class="sticker-grid">
            ${stickersHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Barcode Sticker Label Designer</h3>
              <p className="text-[11px] text-slate-500 font-medium">bwip-js Code128 Thermal Label Generator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
          {/* Live Barcode Sticker Preview (Exact Replica of Uploaded Image) */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100/70 rounded-2xl border border-dashed border-slate-300">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-3">Live Sticker Preview</span>
            
            {/* The Actual Barcode Label Sticker (Matches User Photo) */}
            <div
              className={`bg-white border border-slate-900 rounded-xl p-3 shadow-md flex flex-col justify-between transition-all ${
                labelSize === 'compact' ? 'w-[200px] min-h-[100px]' : labelSize === 'large' ? 'w-[280px] min-h-[140px]' : 'w-[240px] min-h-[120px]'
              }`}
            >
              {showShopName && (
                <div className="text-[10px] text-slate-700 font-normal text-center truncate tracking-tight">
                  {shopName}
                </div>
              )}

              <div className="text-xs font-bold text-slate-900 text-center leading-tight truncate my-1">
                {product.name}
              </div>

              <div className="flex flex-col items-center justify-center my-1">
                <canvas ref={canvasRef} className="max-w-full h-8 object-contain" />
                <div className="text-[11px] font-mono font-bold text-slate-900 tracking-wider mt-0.5">
                  {barcodeValue}
                </div>
              </div>

              {showPrice && (
                <div className="text-right text-sm font-black text-slate-900 tracking-tight leading-none mt-1">
                  RS: {Math.round(product.price)}
                </div>
              )}
            </div>
          </div>

          {/* Label Customization Controls */}
          <div className="flex flex-col gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs mb-1">
              <Settings2 className="w-4 h-4 text-indigo-600" />
              <span>Label Customization Settings</span>
            </div>

            {/* Shop Header Text Input */}
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Shop Title Header</label>
              <input
                type="text"
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Sticker Size Preset Selector */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Sticker Size Preset</label>
                <select
                  className="w-full h-8 px-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none"
                  value={labelSize}
                  onChange={(e: any) => setLabelSize(e.target.value)}
                >
                  <option value="standard">Standard (50mm x 25mm)</option>
                  <option value="compact">Compact (40mm x 20mm)</option>
                  <option value="large">Large Tag (60mm x 30mm)</option>
                </select>
              </div>

              {/* Number of Copies */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Print Copies</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:outline-none"
                  value={copiesCount}
                  onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            {/* Toggle Options */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showShopName}
                  onChange={(e) => setShowShopName(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-primary"
                />
                <span className="font-semibold text-slate-700 text-xs">Show Shop Header</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="checkbox checkbox-xs checkbox-primary"
                />
                <span className="font-semibold text-slate-700 text-xs">Show Price (RS)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleCopyBarcode}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSuccess ? 'Copied Barcode!' : 'Copy Code'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold text-xs cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print {copiesCount} {copiesCount === 1 ? 'Sticker' : 'Stickers'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
