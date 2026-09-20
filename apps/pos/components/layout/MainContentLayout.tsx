'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainContentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPosPage = pathname === '/';

  if (isPosPage) {
    return (
      <div className="h-[calc(100vh-3.5rem)] xl:pl-16 mt-14 overflow-hidden w-full select-none bg-slate-100">
        {children}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] xl:pl-16 mt-14 overflow-y-auto p-3 sm:p-4 lg:p-6 w-full bg-slate-100">
      {children}
    </div>
  );
}
