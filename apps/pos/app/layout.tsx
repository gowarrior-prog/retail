import type { Metadata, Viewport } from 'next';
import './globals.css';
import SidebarWrapper from '@/components/layout/SidebarWrapper';
import MainContentLayout from '@/components/layout/MainContentLayout';

export const metadata: Metadata = {
  title: 'BILAL CLOTH HOUSE — Modern Retail POS v17',
  description: 'Apex Retail Point of Sale System for Bilal Cloth House, Narowal',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className="h-full w-full bg-slate-100 overflow-hidden select-none">
      <body className="h-full w-full font-sans text-slate-800 antialiased bg-slate-100 overflow-hidden">
        <SidebarWrapper />
        <MainContentLayout>{children}</MainContentLayout>
      </body>
    </html>
  );
}
