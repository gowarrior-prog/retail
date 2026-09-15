import type { Metadata } from 'next';
import './globals.css';
import SidebarWrapper from '@/components/layout/SidebarWrapper';

export const metadata: Metadata = {
  title: 'BILAL CLOTH HOUSE — Modern Retail POS v17',
  description: 'Apex Retail Point of Sale System for Bilal Cloth House, Narowal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="min-h-screen bg-slate-100">
      <body className="min-h-screen w-full font-sans text-slate-800 antialiased bg-slate-100 overflow-y-auto">
        <SidebarWrapper />
        <div className="min-h-screen xl:pl-16 pt-18 overflow-y-auto p-4 lg:p-5">
          {children}
        </div>
      </body>
    </html>
  );
}
