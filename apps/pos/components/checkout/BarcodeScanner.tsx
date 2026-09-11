'use client';
import { useState } from 'react';
import { Barcode, User, Phone, Search } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useProductStore } from '@/stores/useProductStore';

export default function BarcodeScanner() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const { addItem } = useCartStore();
  const { products } = useProductStore();
  const { customerName, setCustomerName, customerPhone, setCustomerPhone } = useCartStore();

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toLowerCase();
    const match = products.find(
      (p) =>
        p.id.toLowerCase() === term ||
        (p.barcode && p.barcode.toLowerCase() === term) ||
        p.name.toLowerCase().includes(term)
    );

    if (match) {
      addItem(match);
      setBarcodeInput('');
    } else {
      alert(`No product found for SKU/Barcode: "${barcodeInput}"`);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col gap-3">
      {/* Fast Barcode / SKU Entry Row */}
      <form onSubmit={handleScanSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Barcode className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            className="w-full h-9 pl-9 pr-12 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 font-mono transition-all"
            placeholder="Scan barcode or enter SKU and press Enter..."
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
          />
          <kbd className="absolute right-2.5 bg-white border border-slate-200 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded">
            Enter
          </kbd>
        </div>
        <button
          type="submit"
          className="h-9 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Client / Customer Name & Phone Input Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-center gap-2">
        {/* Client Name Input */}
        <div className="flex-1 flex items-center gap-2 w-full">
          <User className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            placeholder="Client Name (e.g. Walk-in Client / Bilal Ahmed)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Client Phone Input */}
        <div className="flex-1 flex items-center gap-2 w-full">
          <Phone className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            placeholder="Phone (03010606643 for Khata/WhatsApp)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
