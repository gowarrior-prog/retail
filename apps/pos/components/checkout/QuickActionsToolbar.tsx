'use client';
import { PauseCircle, Trash2 } from 'lucide-react';
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
    <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-3 flex items-center justify-between gap-2">
      <div className="text-xs font-mono font-bold text-slate-700">
        {items.length} Distinct Fabric Items
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleParkCart}
          disabled={items.length === 0}
          className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
        >
          <PauseCircle className="w-4 h-4 text-amber-600" />
          <span>Park Cart (F6)</span>
        </button>

        <button
          onClick={handleVoidSale}
          disabled={items.length === 0}
          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95 shadow-2xs"
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span>Void Sale</span>
        </button>
      </div>
    </div>
  );
}
