import type { Metadata } from 'next';
import './globals.css';
import SidebarWrapper from '@/components/layout/SidebarWrapper';

export const metadata: Metadata = {
  title: 'BILAL CLOTH HOUSE — Modern Retail POS v17',
  description: 'Apex Retail Point of Sale System for Bilal Cloth House, Narowal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="h-full bg-slate-100 select-none overflow-hidden">
      <body className="h-full w-full font-sans text-slate-800 antialiased overflow-hidden select-none bg-slate-100">
        <SidebarWrapper />
        <div className="h-full xl:pl-16">
          {children}
        </div>
      </body>
    </html>
  );
}
