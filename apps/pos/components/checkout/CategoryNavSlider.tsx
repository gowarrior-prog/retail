'use client';
import { useRef, useState } from 'react';
import { UserCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import CashierSelectModal from './CashierSelectModal';
import { useCartStore } from '@/stores/useCartStore';

const CATEGORIES = [
  'All Items',
  'Shawls',
  'Abaya',
  'Cotton Karandi',
  'Lawn Collection',
  'Embroidery',
  'Gents',
  'Pashmina',
  'Velvet',
  'Fancy Silk',
  'Winter Wear',
  'Accessories'
];

export interface Cashier {
  id: string;
  name: string;
  role: string;
}

export default function CategoryNavSlider() {
  const { selectedCategory, setCategory } = useProductStore();
  const { cashierName, setCashierName } = useCartStore();
  
  const [showCashierModal, setShowCashierModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleCashierSelect = (cashier: Cashier) => {
    setCashierName(cashier.name);
    setShowCashierModal(false);
  };

  return (
    <div className="flex flex-col shrink-0 bg-slate-50 border-b border-slate-200">
      {/* Category Filter Pills Bar with Cashier btn on left */}
      <div className="px-1 py-1.5 bg-white border-b border-slate-200 flex items-center gap-1 shrink-0">
        
        {/* Cashier Button - Left Side */}
        <button
          onClick={() => setShowCashierModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <UserCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-bold whitespace-nowrap hidden sm:inline">
            {cashierName || 'Cashier'}
          </span>
        </button>

        <div className="h-5 w-px bg-slate-200 mx-0.5 shrink-0" />

        {/* Scroll Left */}
        <button 
          onClick={scrollLeft}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full shrink-0 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Category Pills */}
        <div 
          ref={scrollRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {CATEGORIES.map((cat) => {
            const isSelected =
              selectedCategory === cat || (cat === 'All Items' && (selectedCategory === 'All' || !selectedCategory));
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat === 'All Items' ? 'All' : cat)}
                className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-all duration-200 transform active:scale-95 cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Scroll Right */}
        <button 
          onClick={scrollRight}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full shrink-0 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {showCashierModal && (
        <CashierSelectModal
          currentCashierId={null}
          onSelect={handleCashierSelect}
          onClose={() => setShowCashierModal(false)}
        />
      )}
    </div>
  );
}
