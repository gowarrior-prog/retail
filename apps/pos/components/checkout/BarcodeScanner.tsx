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
        (p.id && p.id.toLowerCase() === term) ||
        (p.barcode && p.barcode.toLowerCase() === term) ||
        p.name.toLowerCase().includes(term)
    );

    if (match) {
      addItem(match);
      setBarcodeInput('');
    } else {
      alert(`No fabric product found for SKU/Barcode: "${barcodeInput}"`);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
      {/* Fast Barcode / SKU Entry Row */}
      <form onSubmit={handleScanSubmit} className="flex items-center gap-2.5">
        <div className="relative flex-1 flex items-center">
          <Barcode className="w-4.5 h-4.5 text-indigo-500 absolute left-3.5 pointer-events-none" />
          <input
            className="w-full h-10 pl-10 pr-14 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono transition-all font-semibold"
            placeholder="Scan barcode or enter fabric SKU and press Enter..."
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
          />
          <kbd className="absolute right-2.5 bg-white border border-slate-200 text-slate-400 font-mono text-[10px] px-1.5 py-0.5 rounded-md shadow-2xs">
            Enter
          </kbd>
        </div>
        <button
          type="submit"
          className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
        >
          <Search className="w-4 h-4" />
          <span>Add</span>
        </button>
      </form>

      {/* Client / Customer Name & Phone Input Bar */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
        {/* Client Name Input */}
        <div className="flex-1 flex items-center gap-2 w-full">
          <User className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            type="text"
            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            placeholder="Client Name (e.g. Walk-in Client)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Client Phone Input */}
        <div className="flex-1 flex items-center gap-2 w-full">
          <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            type="text"
            className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-semibold"
            placeholder="Client Phone (03010606643)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
