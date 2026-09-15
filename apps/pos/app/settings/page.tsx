'use client';

import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, CheckCircle, Database, Server, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { syncOdoo, fetchOdooSettings, triggerManualBackup, getApiBaseUrl, setApiBaseUrl, testServerConnection } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [odooCompany, setOdooCompany] = useState<any>(null);

  // Multi-Terminal Server IP Management
  const [serverIp, setServerIp] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const loadSettings = async () => {
    setServerIp(getApiBaseUrl());
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

  const handleTestConnection = async () => {
    setTestResult({ message: 'Testing shop LAN connection...' });
    const res = await testServerConnection(serverIp);
    setTestResult(res);
  };

  const handleSaveServerIp = () => {
    setApiBaseUrl(serverIp);
    setTestResult({ success: true, message: `Saved! Terminal is now configured to connect to: ${serverIp}` });
  };

  const handleSetLocalhost = () => {
    const defaultUrl = 'http://localhost:8000';
    setServerIp(defaultUrl);
    setApiBaseUrl(defaultUrl);
    setTestResult({ success: true, message: 'Configured as PC 1 (Main Server Terminal - localhost:8000)' });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing products from Odoo ERP into inventory catalog...');
    try {
      const res = await syncOdoo();
      setSyncStatus(res.message || 'Successfully synced with Odoo ERP!');
      await loadSettings();
    } catch (err: any) {
      setSyncStatus(`Sync Error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto pb-10">
      {/* Page Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <Settings className="w-5.5 h-5.5 text-indigo-600" />
            System & Multi-Terminal Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage store profile, 2-PC shop network IP settings, and Odoo ERP sync
          </p>
        </div>
      </div>

      {/* 2-PC Multi-Terminal Shop LAN Config Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 font-sans">
              <Server className="w-4 h-4 text-indigo-600" />
              Multi-PC Terminal Setup & Server IP Connection
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure whether this PC is <strong>PC 1 (Main Server Terminal)</strong> or <strong>PC 2 (Secondary Client Terminal)</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSetLocalhost}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all border border-slate-200 cursor-pointer active:scale-95"
            >
              Set as PC 1 (Local Server)
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Shop Server IP Address / URL (e.g. <span className="font-mono text-indigo-600">192.168.100.2:8000</span> for PC 2)
            </label>
            <input
              type="text"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="e.g. http://192.168.100.2:8000"
              className="w-full h-10 px-3.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-end gap-2 pt-5 sm:pt-0">
            <button
              onClick={handleTestConnection}
              className="h-10 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
            >
              Test Connection
            </button>
            <button
              onClick={handleSaveServerIp}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Save Server IP
            </button>
          </div>
        </div>

        {testResult && (
          <div className={cn(
            'p-3 rounded-xl border text-xs font-mono font-medium',
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          )}>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Shop Identity Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-100">
            <div className="h-12 px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shadow-2xs">
              <img
                src="/Logo.jpg"
                alt="Store Logo"
                className="h-10 w-auto object-contain rounded"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base font-sans">Bilal Cloth & Silk Center</h2>
              <span className="text-xs text-indigo-600 font-medium">Retail POS & Inventory Management</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs text-slate-700 font-medium">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Store Name: <strong className="text-slate-900 font-bold">Bilal Cloth & Silk Center</strong></span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Address: <strong className="text-slate-900 font-bold">Main Bazar Railway Road, Narowal</strong></span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Contact Phone: <strong className="text-slate-900 font-bold">0301-0606643</strong></span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Email: <strong className="text-slate-900 font-bold">bchnarowal@gmail.com</strong></span>
            </div>
          </div>
        </div>

        {/* Database Status Monitor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 font-sans">
              <Database className="w-4 h-4 text-indigo-600" />
              Cloud Data Sync & System Status
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Online
            </span>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Inventory Catalog & Products</div>
                <div className="text-[11px] text-slate-500">Fabric Products, Pricing & Categories</div>
              </div>
              <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                <CheckCircle className="w-4 h-4" /> Active
              </span>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Staff & Operations</div>
                <div className="text-[11px] text-slate-500">Employee Roster & Payroll</div>
              </div>
              <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                <CheckCircle className="w-4 h-4" /> Active
              </span>
            </div>

            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Billing History & Customer Ledger</div>
                <div className="text-[11px] text-slate-500">Invoices, Khata Ledger & Purchases</div>
              </div>
              <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                <CheckCircle className="w-4 h-4" /> Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Hard Drive Storage & 2nd PC Sharing Explorer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 font-sans">
              <Database className="w-4 h-4 text-emerald-600" />
              Local Hard Drive Offline Storage & 2nd PC Data Sharing
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All 5 system modules are backed up locally in JSON & SQLite under <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800">apps/api/data/</code>
            </p>
          </div>

          <button
            onClick={async () => {
              setIsSyncing(true);
              try {
                const res = await triggerManualBackup();
                setSyncStatus(`Manual Backup Complete! ${JSON.stringify(res.stats)}`);
              } catch (err: any) {
                setSyncStatus(`Backup Error: ${err.message}`);
              } finally {
                setIsSyncing(false);
              }
            }}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={isSyncing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            <span>Backup All Data to Hard Drive Now</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">1. Products Catalog</span>
            <span className="text-base font-bold text-slate-900">local_catalog_backup.json</span>
            <span className="text-xs font-mono text-emerald-600 font-bold mt-1">✓ Saved on Hard Drive</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">2. Customer Khata</span>
            <span className="text-base font-bold text-slate-900">local_khata_backup.json</span>
            <span className="text-xs font-mono text-emerald-600 font-bold mt-1">✓ Saved on Hard Drive</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">3. POS Bills & Invoices</span>
            <span className="text-base font-bold text-slate-900">local_billing_backup.json</span>
            <span className="text-xs font-mono text-emerald-600 font-bold mt-1">✓ Saved on Hard Drive</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">4. Employees & Staff</span>
            <span className="text-base font-bold text-slate-900">local_employees_backup.json</span>
            <span className="text-xs font-mono text-emerald-600 font-bold mt-1">✓ Saved on Hard Drive</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">5. Shop Purchases</span>
            <span className="text-base font-bold text-slate-900">local_purchases_backup.json</span>
            <span className="text-xs font-mono text-emerald-600 font-bold mt-1">✓ Saved on Hard Drive</span>
          </div>
        </div>

        <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between font-medium">
          <div>
            <strong>💡 2nd PC Sharing & Network Sync:</strong>
            <p className="text-[11px] text-indigo-700 mt-0.5">
              To transfer offline data to a 2nd PC on the same Wi-Fi, copy the files from <code className="font-mono bg-white/80 px-1 rounded">apps/api/data/</code> or access the API endpoint <code className="font-mono bg-white/80 px-1 rounded">http://[THIS-PC-IP]:8000/offline-summary</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
