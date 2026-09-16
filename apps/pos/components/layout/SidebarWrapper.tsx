'use client';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { syncPendingOfflineData } from '@/lib/api';

export default function SidebarWrapper() {
  useEffect(() => {
    // Run initial sync check for offline bills
    syncPendingOfflineData();

    // Auto-sync when internet/network connection comes back online or app window is focused
    const handleSync = () => {
      console.log('[Auto-Sync] Triggering background sync check...');
      syncPendingOfflineData();
    };

    window.addEventListener('online', handleSync);
    window.addEventListener('focus', handleSync);

    // Periodic auto-sync worker every 5 seconds
    const intervalId = setInterval(() => {
      syncPendingOfflineData();
    }, 5000);

    return () => {
      window.removeEventListener('online', handleSync);
      window.removeEventListener('focus', handleSync);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>
      <Sidebar />
    </>
  );
}
