'use client';

import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import CatalogToast from '../inventory/CatalogToast';
import ProfessionalAlertModal from './ProfessionalAlertModal';

export default function MainContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 antialiased font-sans">
      {/* 1. Header (Brand Header) */}
      <Header />

      {/* 2. Main Workspace (Sidebar + Page Content) */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0 bg-[#f8fafc] flex flex-col">
          {children}
        </main>
      </div>

      {/* 3. Global Bottom-Right Catalog Action Animated Toast */}
      <CatalogToast />

      {/* 4. Global Centered Professional Alert Modal */}
      <ProfessionalAlertModal />
    </div>
  );
}
