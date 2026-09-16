'use client';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { syncPendingOfflineData } from '@/lib/api';

export default function SidebarWrapper() {
  useEffect(() => {
    // Run initial sync check for offline bills
    syncPendingOfflineData();

    // Auto-sync when internet/network connection comes back online
    const handleOnline = () => {
      console.log('[Auto-Sync] Network connection restored! Syncing pending offline bills to cloud...');
      syncPendingOfflineData();
    };

    window.addEventListener('online', handleOnline);

    // Periodic auto-sync worker every 30 seconds
    const intervalId = setInterval(() => {
      syncPendingOfflineData();
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
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
