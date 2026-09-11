import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Bilal Cloth & Silk Center — POS',
  description: 'Point of Sale System for Bilal Cloth and Silk Center, Narowal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body className="bg-base-200 font-sans text-sm text-slate-800 min-h-screen antialiased">
        <Header />
        <Sidebar />
        <div className="pl-16 pt-16 min-h-screen">
          <main className="p-4 lg:p-5">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
