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
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self' ipc: http://ipc.localhost; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data: blob: http: https:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost http://localhost:* http://127.0.0.1:* http://192.168.100.* http://bilalclothpos.com:* ws://localhost:* ws://127.0.0.1:*; object-src 'none'; base-uri 'self';"
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="h-full w-full font-sans text-slate-800 antialiased bg-slate-100 overflow-hidden">
        <SidebarWrapper />
        <MainContentLayout>{children}</MainContentLayout>
      </body>
    </html>
  );
}
