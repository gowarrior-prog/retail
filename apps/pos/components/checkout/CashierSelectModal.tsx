'use client';
import { useState, useEffect } from 'react';
import { X, UserCircle2, Loader2, Check } from 'lucide-react';
import { fetchEmployees } from '@/lib/api';

interface CashierSelectModalProps {
  currentCashierId: string | null;
  onSelect: (cashier: { id: string; name: string; role: string }) => void;
  onClose: () => void;
}

export default function CashierSelectModal({ currentCashierId, onSelect, onClose }: CashierSelectModalProps) {
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchEmployees();
        // Filter out those who aren't cashiers if needed, or just show all employees
        setCashiers(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Select Cashier</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose the active shift cashier</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
              <p className="text-sm font-medium">Loading cashiers...</p>
            </div>
          ) : cashiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <UserCircle2 className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No cashiers found in database.</p>
            </div>
          ) : (
            <div className="grid gap-1.5 p-1">
              {cashiers.map(c => {
                const isSelected = currentCashierId === String(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelect({ id: String(c.id), name: c.name, role: c.role || 'Cashier' })}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-50 border border-emerald-200 shadow-sm' 
                        : 'bg-white border border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <UserCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{c.role || 'Staff'}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-emerald-600 mr-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
