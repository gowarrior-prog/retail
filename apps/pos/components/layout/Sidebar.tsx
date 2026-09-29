'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  Grid,
  Clock,
  RotateCcw,
  Users,
  UserCheck,
  Settings,
  ShoppingCartPlus,
  LucideShoppingCart,
  LockKeyholeOpenIcon,
  BookOpenCheck,
  ChartAreaIcon,
  ChartBar,
  ChartBarIncreasing,
  ChartCandlestickIcon,
  ChartBarIncreasingIcon,
  AreaChart,
  TruckElectric,
  Rotate3D,
  Rotate3d,
  RotateCcwClockIcon,
  RotateCcwKey,
  RotateCcwSquare,
  ArrowBigLeftDash,
  ArrowDownAZIcon,
  CircleArrowOutUpLeftIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/useCartStore';

const navItemsTop = [
  { href: '/', label: 'Bill', icon: LucideShoppingCart},
  { href: '/inventory', label: 'Catalog', icon: ShoppingBag},
  { href: '/khata', label: 'Ledger', icon: BookOpenCheck},
  { href: '/purchases', label: 'Purchases', icon: TruckElectric },
  { href: '/returns', label: 'Returns', icon: RotateCcw },
  { href: '/employees', label: 'Employees', icon: Users},
];

const navItemsBottom = [
  { href: '/analytics', label: 'Analytics', icon: ChartBarIncreasingIcon},
  { href: '/settings', label: 'Setup', icon: Settings},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { heldBills } = useCartStore();

  const activeTopIndex = navItemsTop.findIndex(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  );

  const activeBottomIndex = navItemsBottom.findIndex(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  );

  return (
    <aside className="w-[64px] bg-white border-r border-slate-200 flex flex-col items-center justify-between py-3 shrink-0 select-none z-30 font-sans">
      {/* Top Nav with Sliding Active Pill */}
      <nav className="relative flex flex-col items-center gap-2.5 w-full">
        {/* Sliding Green Active Background Box */}
        {activeTopIndex >= 0 && (
          <div
            className="absolute top-0 left-1.5 w-[52px] h-[52px] bg-[#1b3830] rounded-xl shadow-sm transition-transform duration-300 ease-in-out pointer-events-none z-0"
            style={{ transform: `translateY(${activeTopIndex * 62}px)` }}
          />
        )}

        {navItemsTop.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl transition-colors duration-200 group cursor-pointer relative select-none z-10',
                isActive ? 'text-white font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
              )}
              title={`${item.label}`}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isActive ? 'text-white' : 'text-slate-600 group-hover:scale-110'
                )}
              />
              <span className="text-[10px] tracking-tight mt-1 leading-none font-semibold">
                {item.label}
              </span>
              {item.label === 'Hold' && heldBills.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {heldBills.length}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Nav with Sliding Active Pill */}
      <div className="relative flex flex-col items-center gap-2.5 w-full pt-3 border-t border-slate-100">
        {activeBottomIndex >= 0 && (
          <div
            className="absolute top-3 left-1.5 w-[52px] h-[52px] bg-[#1b3830] rounded-xl shadow-sm transition-transform duration-300 ease-in-out pointer-events-none z-0"
            style={{ transform: `translateY(${activeBottomIndex * 62}px)` }}
          />
        )}

        {navItemsBottom.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl transition-colors duration-200 group cursor-pointer relative select-none z-10',
                isActive ? 'text-white font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
              )}
              title={`${item.label}`}
            >
              <Icon
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isActive ? 'text-white' : 'text-slate-600 group-hover:scale-110'
                )}
              />
              <span className="text-[10px] tracking-tight mt-1 leading-none font-semibold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
