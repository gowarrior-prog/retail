'use client';

import React, { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { X, Printer, Settings2, Copy, Check, Save, RotateCcw, LayoutTemplate } from 'lucide-react';
import { Product } from '@/lib/api';

interface BarcodePrinterModalProps {
  product: Product;
  onClose: () => void;
}

export interface LabelTemplate {
  id: string;
  name: string;
  shopName: string;
  showShopName: boolean;
  showPrice: boolean;
  labelWidthMm: number;
  labelHeightMm: number;
  barcodeWidthMm: number;
  barcodeHeightMm: number;
  shopFontSizePt: number;
  titleFontSizePt: number;
  barcodeTextFontSizePt: number;
  priceFontSizePt: number;
}

const DEFAULT_TEMPLATES: LabelTemplate[] = [
  {
    id: 'standard_50x25',
    name: 'TSC Standard Label (50mm x 25mm)',
    shopName: 'Bilal Cloth & Silk Center Narowal',
    showShopName: true,
    showPrice: true,
    labelWidthMm: 50,
    labelHeightMm: 25,
    barcodeWidthMm: 44,
    barcodeHeightMm: 8.5,
    shopFontSizePt: 6,
    titleFontSizePt: 7,
    barcodeTextFontSizePt: 6,
    priceFontSizePt: 7.5,
  },
  {
    id: 'compact_38x25',
    name: 'Small Sticker (38mm x 25mm)',
    shopName: 'Bilal Cloth & Silk Center Narowal',
    showShopName: true,
    showPrice: true,
    labelWidthMm: 38,
    labelHeightMm: 25,
    barcodeWidthMm: 34,
    barcodeHeightMm: 8.5,
    shopFontSizePt: 5.5,
    titleFontSizePt: 6.5,
    barcodeTextFontSizePt: 5.5,
    priceFontSizePt: 7,
  },
  {
    id: 'medium_50x30',
    name: 'Medium Label (50mm x 30mm)',
    shopName: 'Bilal Cloth & Silk Center Narowal',
    showShopName: true,
    showPrice: true,
    labelWidthMm: 50,
    labelHeightMm: 30,
    barcodeWidthMm: 44,
    barcodeHeightMm: 10,
    shopFontSizePt: 6.5,
    titleFontSizePt: 7.5,
    barcodeTextFontSizePt: 6.5,
    priceFontSizePt: 8,
  },
];

const LOCAL_STORAGE_KEY = 'pos_barcode_saved_templates';
const LAST_USED_TEMPLATE_KEY = 'pos_barcode_last_template_id';

export default function BarcodePrinterModal({ product, onClose }: BarcodePrinterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Template State
  const [templates, setTemplates] = useState<LabelTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('standard_50x25');

  // Active Editing Fields
  const [templateName, setTemplateName] = useState<string>('TSC Standard Label (50mm x 25mm)');
  const [shopName, setShopName] = useState<string>('Bilal Cloth & Silk Center Narowal');
  const [showShopName, setShowShopName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [labelWidthMm, setLabelWidthMm] = useState<number>(50);
  const [labelHeightMm, setLabelHeightMm] = useState<number>(25);
  const [barcodeWidthMm, setBarcodeWidthMm] = useState<number>(44);
  const [barcodeHeightMm, setBarcodeHeightMm] = useState<number>(8.5);
  const [shopFontSizePt, setShopFontSizePt] = useState<number>(6);
  const [titleFontSizePt, setTitleFontSizePt] = useState<number>(7);
  const [barcodeTextFontSizePt, setBarcodeTextFontSizePt] = useState<number>(6);
  const [priceFontSizePt, setPriceFontSizePt] = useState<number>(7.5);

  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<boolean>(false);

  const barcodeValue = product.barcode || product.sku || product.id.slice(0, 8);

  // Load saved templates on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Discard vertical templates and recalibrate oversized standard_50x25
          const sanitized = parsed
            .filter((t: any) => t.id !== 'vertical_tag_25x50' && (t.labelWidthMm || 50) >= (t.labelHeightMm || 25))
            .map((t: any) => {
              if (t.id === 'standard_50x25' && t.barcodeHeightMm > 9) {
                return {
                  ...t,
                  barcodeWidthMm: 44,
                  barcodeHeightMm: 8.5,
                  shopFontSizePt: 6,
                  titleFontSizePt: 7,
                  barcodeTextFontSizePt: 6,
                  priceFontSizePt: 7.5,
                };
              }
              return t;
            });

          if (sanitized.length > 0) {
            setTemplates(sanitized);
          } else {
            setTemplates(DEFAULT_TEMPLATES);
          }
        }
      }
      const lastId = localStorage.getItem(LAST_USED_TEMPLATE_KEY);
      if (lastId && lastId !== 'vertical_tag_25x50') {
        setSelectedTemplateId(lastId);
      } else {
        setSelectedTemplateId('standard_50x25');
      }
    } catch (e) {
      console.error('Error loading saved label templates:', e);
    }
  }, []);

  // Sync active controls when template selection changes
  useEffect(() => {
    const active = templates.find((t) => t.id === selectedTemplateId) || templates[0];
    if (active) {
      setTemplateName(active.name);
      setShopName(active.shopName);
      setShowShopName(active.showShopName);
      setShowPrice(active.showPrice);
      setLabelWidthMm(active.labelWidthMm);
      setLabelHeightMm(active.labelHeightMm);
      setBarcodeWidthMm(active.barcodeWidthMm);
      setBarcodeHeightMm(active.barcodeHeightMm);
      setShopFontSizePt(active.shopFontSizePt);
      setTitleFontSizePt(active.titleFontSizePt);
      setBarcodeTextFontSizePt(active.barcodeTextFontSizePt);
      setPriceFontSizePt(active.priceFontSizePt);
    }
  }, [selectedTemplateId, templates]);

  // Render Preview Canvas
  useEffect(() => {
    if (canvasRef.current && barcodeValue) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: 'code128',
          text: barcodeValue,
          scale: 3,
          height: 10,
          includetext: false,
          textxalign: 'center',
          backgroundcolor: 'FFFFFF',
        });
      } catch (err) {
        console.error('bwip-js preview render error:', err);
      }
    }
  }, [barcodeValue, barcodeWidthMm, barcodeHeightMm]);

  // Render High-DPI Print Canvas
  useEffect(() => {
    if (printCanvasRef.current && barcodeValue) {
      try {
        bwipjs.toCanvas(printCanvasRef.current, {
          bcid: 'code128',
          text: barcodeValue,
          scale: 5,
          height: 14,
          includetext: false,
          paddingwidth: 2,
          backgroundcolor: 'FFFFFF',
        });
      } catch (err) {
        console.error('bwip-js print render error:', err);
      }
    }
  }, [barcodeValue, barcodeWidthMm, barcodeHeightMm]);

  const handleSaveTemplate = () => {
    const updatedTemplate: LabelTemplate = {
      id: selectedTemplateId || `custom_${Date.now()}`,
      name: templateName || 'Custom Design',
      shopName,
      showShopName,
      showPrice,
      labelWidthMm,
      labelHeightMm,
      barcodeWidthMm,
      barcodeHeightMm,
      shopFontSizePt,
      titleFontSizePt,
      barcodeTextFontSizePt,
      priceFontSizePt,
    };

    const existsIndex = templates.findIndex((t) => t.id === updatedTemplate.id);
    let newTemplates = [...templates];
    if (existsIndex >= 0) {
      newTemplates[existsIndex] = updatedTemplate;
    } else {
      newTemplates.push(updatedTemplate);
    }

    setTemplates(newTemplates);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTemplates));
    localStorage.setItem(LAST_USED_TEMPLATE_KEY, updatedTemplate.id);
    setSelectedTemplateId(updatedTemplate.id);

    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleResetDefault = () => {
    setTemplates(DEFAULT_TEMPLATES);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setSelectedTemplateId('standard_50x25');
  };

  const escapeHtml = (str: string) =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const handlePrint = () => {
    localStorage.setItem(LAST_USED_TEMPLATE_KEY, selectedTemplateId);

    const priceText = showPrice ? `RS: ${Math.round(product.price)}` : '';
    const canvasDataUrl = printCanvasRef.current
      ? printCanvasRef.current.toDataURL('image/png')
      : canvasRef.current
      ? canvasRef.current.toDataURL('image/png')
      : '';

    const total = Math.max(1, copiesCount);
    let stickersHtml = '';
    for (let i = 0; i < total; i++) {
      stickersHtml += `
        <div class="sticker-card">
          ${showShopName ? `<div class="shop-name">${escapeHtml(shopName)}</div>` : ''}
          <div class="product-title">${escapeHtml(product.name)}</div>
          <div class="barcode-container">
            <img src="${canvasDataUrl}" class="barcode-img" alt="barcode" />
            <div class="barcode-text">${escapeHtml(barcodeValue)}</div>
          </div>
          ${showPrice ? `<div class="price-tag">${priceText}</div>` : ''}
        </div>
      `;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print Barcode - ${escapeHtml(product.name)}</title>
          <style>
            @media print {
              @page {
                size: ${labelWidthMm}mm ${labelHeightMm}mm;
                margin: 0 !important;
              }
              html, body {
                width: ${labelWidthMm}mm !important;
                height: ${labelHeightMm}mm !important;
                max-height: ${labelHeightMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              .sticker-card {
                width: ${labelWidthMm}mm !important;
                height: ${labelHeightMm}mm !important;
                max-height: ${labelHeightMm}mm !important;
                page-break-after: always !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
              .sticker-card:last-child {
                page-break-after: auto !important;
              }
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: #fff;
              color: #000;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sticker-card {
              width: ${labelWidthMm}mm;
              height: ${labelHeightMm}mm;
              max-height: ${labelHeightMm}mm;
              padding: 0.6mm 1.2mm 0.4mm 1.2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              background: #fff;
              overflow: hidden;
              box-sizing: border-box;
            }
            .shop-name {
              font-size: ${shopFontSizePt}pt;
              font-weight: bold;
              text-align: center;
              line-height: 1;
              width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 0.2mm;
            }
            .product-title {
              font-size: ${titleFontSizePt}pt;
              font-weight: 800;
              text-align: center;
              line-height: 1;
              width: 100%;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 0.2mm;
            }
            .barcode-container {
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0;
            }
            .barcode-img {
              width: ${barcodeWidthMm}mm;
              height: ${barcodeHeightMm}mm;
              max-height: ${barcodeHeightMm}mm;
              object-fit: fill;
              display: block;
              margin: 0 auto;
              image-rendering: pixelated;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            .barcode-text {
              font-size: ${barcodeTextFontSizePt}pt;
              font-family: 'Courier New', Courier, monospace;
              font-weight: bold;
              text-align: center;
              letter-spacing: 0.5px;
              line-height: 1;
              margin-top: 0.2mm;
            }
            .price-tag {
              font-size: ${priceFontSizePt}pt;
              font-weight: 900;
              text-align: right;
              line-height: 1;
              width: 100%;
              margin-top: 0.2mm;
            }
          </style>
        </head>
        <body>
          ${stickersHtml}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
      return;
    }

    let iframe = document.getElementById('barcode-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'barcode-print-iframe';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      document.body.appendChild(iframe);
    }
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 400);
    }
  };

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                BarTender Label Designer
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Custom Saved Design
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Design, customize, save templates & print instant barcode stickers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Preset Template Selector */}
          <div className="flex items-center justify-between bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <LayoutTemplate className="w-4 h-4 text-indigo-600" />
              <span>Saved Design Presets:</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleResetDefault}
                title="Reset to default templates"
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="flex flex-col items-center justify-center p-5 bg-slate-100/80 rounded-2xl border border-dashed border-slate-300">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              1:1 Live BarTender Visual Preview
            </span>

            <div
              style={{
                width: `${labelWidthMm * 4.5}px`,
                height: `${labelHeightMm * 4.5}px`,
                maxHeight: `${labelHeightMm * 4.5}px`,
              }}
              className="bg-white border-2 border-slate-900 rounded-lg px-2 py-1 shadow-md flex flex-col justify-between items-center transition-all overflow-hidden"
            >
              {showShopName && (
                <div
                  style={{ fontSize: `${shopFontSizePt * 1.5}px` }}
                  className="font-bold text-slate-800 text-center truncate w-full"
                >
                  {shopName}
                </div>
              )}

              <div
                style={{ fontSize: `${titleFontSizePt * 1.5}px` }}
                className="font-black text-slate-900 text-center truncate w-full"
              >
                {product.name}
              </div>

              <div className="flex flex-col items-center justify-center w-full">
                <canvas ref={canvasRef} className="max-w-full h-8 object-contain" />
                <div
                  style={{ fontSize: `${barcodeTextFontSizePt * 1.5}px` }}
                  className="font-mono font-bold text-slate-900 tracking-wider text-center"
                >
                  {barcodeValue}
                </div>
              </div>

              <canvas ref={printCanvasRef} className="hidden" />

              {showPrice && (
                <div
                  style={{ fontSize: `${priceFontSizePt * 1.5}px` }}
                  className="font-black text-slate-900 text-right w-full tracking-tight"
                >
                  RS: {Math.round(product.price)}
                </div>
              )}
            </div>
          </div>

          {/* Controls & Customization Grid */}
          <div className="flex flex-col gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                <span>BarTender Design Customization Controls</span>
              </div>

              {saveSuccessMsg && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ✓ Template Saved Successfully!
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Design Template Name</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Shop Title Header</label>
                <input
                  type="text"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </div>
            </div>

            {/* Dimension Sliders */}
            <div className="grid grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Label Width (mm)</label>
                <input
                  type="number"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  value={labelWidthMm}
                  onChange={(e) => setLabelWidthMm(Number(e.target.value) || 50)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Label Height (mm)</label>
                <input
                  type="number"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                  value={labelHeightMm}
                  onChange={(e) => setLabelHeightMm(Number(e.target.value) || 25)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Barcode Width (mm)</label>
                <input
                  type="number"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-indigo-700"
                  value={barcodeWidthMm}
                  onChange={(e) => setBarcodeWidthMm(Number(e.target.value) || 48)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Barcode Height (mm)</label>
                <input
                  type="number"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-indigo-700"
                  value={barcodeHeightMm}
                  onChange={(e) => setBarcodeHeightMm(Number(e.target.value) || 13)}
                />
              </div>
            </div>

            {/* Font Size Adjustments */}
            <div className="grid grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Shop Font (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono"
                  value={shopFontSizePt}
                  onChange={(e) => setShopFontSizePt(Number(e.target.value) || 6)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Title Font (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono"
                  value={titleFontSizePt}
                  onChange={(e) => setTitleFontSizePt(Number(e.target.value) || 8)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Code Font (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono"
                  value={barcodeTextFontSizePt}
                  onChange={(e) => setBarcodeTextFontSizePt(Number(e.target.value) || 7)}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Price Font (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono"
                  value={priceFontSizePt}
                  onChange={(e) => setPriceFontSizePt(Number(e.target.value) || 9)}
                />
              </div>
            </div>

            {/* Checkboxes & Print Copies */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="checkbox checkbox-xs checkbox-primary"
                  />
                  <span className="font-semibold text-slate-700 text-xs">Show Header</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="checkbox checkbox-xs checkbox-primary"
                  />
                  <span className="font-semibold text-slate-700 text-xs">Show Price</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-slate-600 font-semibold">Print Copies:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-16 h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-center text-slate-800"
                  value={copiesCount}
                  onChange={(e) => setCopiesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBarcode}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedSuccess ? 'Copied Barcode!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleSaveTemplate}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Design Template</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold text-xs cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
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