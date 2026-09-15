'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, BarChart3, Users, BookOpen, ShoppingBag, Settings, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';

const navItems = [
  { href: '/', label: 'POS', icon: ShoppingCart, shortcut: 'F2' },
  { href: '/inventory', label: 'Stock', icon: Package, shortcut: 'F3' },
  { href: '/khata', label: 'Khata', icon: BookOpen, shortcut: 'F4' },
  { href: '/purchases', label: 'Buy', icon: ShoppingBag, shortcut: 'F5' },
  { href: '/employees', label: 'Staff', icon: Users, shortcut: 'F6' },
  { href: '/analytics', label: 'Sales', icon: BarChart3, shortcut: 'F9' },
  { href: '/settings', label: 'Setup', icon: Settings, shortcut: 'F10' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { heldOrdersCount, sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-14 bottom-0 w-16 bg-white border-r border-slate-200 z-50 flex flex-col items-center justify-between py-3 shadow-2xs transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
      )}>
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all relative group cursor-pointer active:scale-95',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                )}
                title={`${item.label} (${item.shortcut})`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9.5px] font-bold mt-0.5 tracking-tight">{item.label}</span>
                {item.label === 'POS' && heldOrdersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {heldOrdersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-3 w-full px-2">
          <div
            className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-2xs"
            title="Terminal Status Online"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
          </div>
        </div>
      </aside>
    </>
  );
}
