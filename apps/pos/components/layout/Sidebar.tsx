'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, BarChart3, Users, Lock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

const navItems = [
  { href: '/', label: 'Checkout', icon: ShoppingCart, shortcut: 'F2' },
  { href: '/inventory', label: 'Inventory', icon: Package, shortcut: 'F3' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, shortcut: 'F9' },
  { href: '/employees', label: 'Employees', icon: Users, shortcut: 'F4' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { heldOrdersCount } = useUIStore();

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 bg-white border-r border-slate-200 z-40 flex flex-col items-center justify-between py-4">
      <nav className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-12 h-12 rounded-lg flex flex-col items-center justify-center transition-colors relative group',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              )}
              title={`${item.label} (${item.shortcut})`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold mt-0.5">{item.label.slice(0, 5)}</span>
              {item.label === 'Checkout' && heldOrdersCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-slate-200 text-slate-800 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {heldOrdersCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3 w-full px-2">
        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600" title="Terminal Status OK">
          <CheckCircle className="w-4 h-4 text-slate-700" />
        </div>
        <button className="w-11 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors" title="Lock Terminal (Esc)">
          <Lock className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
