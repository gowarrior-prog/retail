'use client';

import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, CheckCircle2, Database, Server, Building2, Phone, Mail, MapPin, ShieldCheck, Zap } from 'lucide-react';
import { syncOdoo, fetchOdooSettings, triggerManualBackup, discoverLocalServer, testServerConnection } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [odooCompany, setOdooCompany] = useState<any>(null);
  const [autoDiscoverStatus, setAutoDiscoverStatus] = useState<string>('Auto-Discovery Active');
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  const loadSettings = async () => {
    try {
      const data = await fetchOdooSettings();
      setOdooCompany(data);
    } catch (err) {
      console.error('Failed to load Odoo settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleAutoDiscover = async () => {
    setIsDiscovering(true);
    setAutoDiscoverStatus('Scanning local shop network for PC 1 server...');
    const res = await discoverLocalServer();
    setAutoDiscoverStatus(res.message);
    setIsDiscovering(false);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing catalog & company profile from Odoo ERP...');
    try {
      const res = await syncOdoo();
      setSyncStatus(res.message || 'Successfully synced with Odoo ERP!');
      await loadSettings();
    } catch (err: any) {
      setSyncStatus(`Sync Notice: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto pb-8">
      {/* Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <Settings className="w-5.5 h-5.5 text-emerald-600" />
            System & Store Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage store profile, automatic 2-PC shop network connectivity, and Odoo ERP sync
          </p>
        </div>
      </div>

      {/* Zero-IP Automatic Network Connection Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Automatic Shop Network Connection</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic zero-configuration connection between PC 1 (Main Server) and PC 2
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoDiscover}
            disabled={isDiscovering}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isDiscovering && 'animate-spin')} />
            <span>{isDiscovering ? 'Scanning Network...' : 'Auto-Discover PC 1 Server'}</span>
          </button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Status: <strong>{autoDiscoverStatus}</strong></span>
        </div>
      </div>

      {/* Store Profile & Odoo Sync Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-emerald-600" />
              Store Profile & Odoo ERP Integration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Synced company details and Odoo data sync</p>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4 text-emerald-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Odoo Catalog'}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Company Name</span>
              <span className="font-bold text-slate-900">{odooCompany?.company_name || 'Bilal Cloth and Silk Center'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Phone Number</span>
              <span className="font-bold text-slate-900 font-mono">{odooCompany?.phone || '0301-0606643'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Store Address</span>
              <span className="font-bold text-slate-900">{odooCompany?.address || 'Main Bazar Railway Road, Narowal.'}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Local Storage Mode</span>
              <span className="font-bold text-emerald-700">SQLite Server (pos_local.db) Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
