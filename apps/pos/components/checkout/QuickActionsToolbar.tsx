'use client';
import { PauseCircle, Trash2, Tag } from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { useUIStore } from '@/stores/useUIStore';

export default function QuickActionsToolbar() {
  const { items, clearCart } = useCartStore();
  const { heldOrdersCount, setHeldOrdersCount } = useUIStore();

  const handleParkCart = () => {
    if (items.length === 0) return;
    setHeldOrdersCount(heldOrdersCount + 1);
    clearCart();
    alert('Active cart parked to Held Orders.');
  };

  const handleVoidSale = () => {
    if (items.length === 0) return;
    if (confirm('Are you sure you want to void this sale and clear the cart?')) {
      clearCart();
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
      <div className="text-xs font-mono font-semibold text-slate-600">
        {items.length} Distinct Items
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleParkCart}
          disabled={items.length === 0}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <PauseCircle className="w-3.5 h-3.5" />
          <span>Park Cart (F6)</span>
        </button>

        <button
          onClick={handleVoidSale}
          disabled={items.length === 0}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-600" />
          <span>Void Sale</span>
        </button>
      </div>
    </div>
  );
}
