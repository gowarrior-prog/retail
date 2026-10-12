'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Server,
  Database,
  User,
  Key,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Trash2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  fetchOdooConfig,
  testOdooConnection,
  wipeAndSyncOdoo,
  OdooConnectionTestResult,
} from '@/lib/api/odoo';
import { useProductStore } from '@/stores/useProductStore';

interface OdooSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OdooSyncModal({ isOpen, onClose, onSuccess }: OdooSyncModalProps) {
  const { loadProducts } = useProductStore();

  const [odooUrl, setOdooUrl] = useState('http://localhost:8069');
  const [odooDb, setOdooDb] = useState('BilalClothHouse');
  const [odooUser, setOdooUser] = useState('bchnarowal@gmail.com');
  const [odooPass, setOdooPass] = useState('bilas58a');
  const [showPassword, setShowPassword] = useState(false);
  const [wipeOldData, setWipeOldData] = useState(true);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<OdooConnectionTestResult | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('');
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load active Odoo config from backend or localStorage on open
  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('pos_odoo_url');
      const savedDb = localStorage.getItem('pos_odoo_db');
      const savedUser = localStorage.getItem('pos_odoo_user');
      if (savedUrl) setOdooUrl(savedUrl);
      if (savedDb) setOdooDb(savedDb);
      if (savedUser) setOdooUser(savedUser);
    }

    fetchOdooConfig().then((cfg) => {
      if (cfg) {
        if (cfg.url && !localStorage.getItem('pos_odoo_url')) setOdooUrl(cfg.url);
        if (cfg.db && !localStorage.getItem('pos_odoo_db')) setOdooDb(cfg.db);
        if (cfg.user && !localStorage.getItem('pos_odoo_user')) setOdooUser(cfg.user);
      }
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncResult(null);

    try {
      const res = await testOdooConnection({
        odoo_url: odooUrl.trim(),
        odoo_db: odooDb.trim(),
        odoo_user: odooUser.trim(),
        odoo_pass: odooPass.trim(),
      });
      setTestResult(res);

      if (res.status === 'success' && typeof window !== 'undefined') {
        localStorage.setItem('pos_odoo_url', odooUrl.trim());
        localStorage.setItem('pos_odoo_db', odooDb.trim());
        localStorage.setItem('pos_odoo_user', odooUser.trim());
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        connected: false,
        message: err.message || 'Server connection failed. Could not reach Odoo.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleStartSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncStatusText('Odoo ERP se connect ho raha hai...');

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_odoo_url', odooUrl.trim());
        localStorage.setItem('pos_odoo_db', odooDb.trim());
        localStorage.setItem('pos_odoo_user', odooUser.trim());
      }

      setSyncStatusText(wipeOldData ? 'Puraana data wipe ho raha hai aur fresh Odoo sync shuru hai...' : 'Odoo catalog & finance sync shuru hai...');

      const res = await wipeAndSyncOdoo({
        odoo_url: odooUrl.trim(),
        odoo_db: odooDb.trim(),
        odoo_user: odooUser.trim(),
        odoo_pass: odooPass.trim(),
        wipe_old_data: wipeOldData,
      });

      setSyncStatusText('POS catalog cache update ho raha hai...');
      await loadProducts();
      window.dispatchEvent(new Event('pos-data-updated'));

      setSyncResult({
        success: res.status === 'success',
        message: res.message || 'Odoo ERP se saara data successfully import ho gaya!',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Odoo Sync mukammal nahi ho saka. Connection aur settings check karein.',
      });
    } finally {
      setIsSyncing(false);
      setSyncStatusText('');
    }
  };

  const quickPresets = [
    { label: 'Localhost (This PC)', url: 'http://localhost:8069' },
    { label: 'Local IP (127.0.0.1)', url: 'http://127.0.0.1:8069' },
    { label: 'Server (192.168.100.2)', url: 'http://192.168.100.2:8069' },
    { label: 'Shop PC (192.168.100.70)', url: 'http://192.168.100.70:8069' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#1b3830] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 text-emerald-300 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Odoo ERP Data Synchronization</h2>
              <p className="text-xs text-emerald-200/80">Import Products, Khata, Employees & Purchases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Diagnostic / Status Alert Box */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.suggested_url && (
                  <button
                    onClick={() => {
                      if (testResult.suggested_url) {
                        setOdooUrl(testResult.suggested_url);
                        setTestResult(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded cursor-pointer mt-1"
                  >
                    Click to switch URL to: {testResult.suggested_url}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sync Result Alert Box */}
          {syncResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                syncResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-semibold">{syncResult.message}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Odoo URL */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#1b3830]" />
                  Odoo ERP URL / IP
                </span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. http://localhost:8069</span>
              </label>
              <input
                type="text"
                value={odooUrl}
                onChange={(e) => {
                  setOdooUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="http://192.168.100.2:8069"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1b3830]/30 font-mono text-slate-800"
              />

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {quickPresets.map((p) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => {
                      setOdooUrl(p.url);
                      setTestResult(null);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                      odooUrl === p.url
                        ? 'bg-[#1b3830] text-white border-[#1b3830] font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Database & User */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-[#1b3830]" />
                  Database Name
                </label>
                <input
                  type="text"
                  value={odooDb}
                  onChange={(e) => setOdooDb(e.target.value)}
                  placeholder="BilalClothHouse"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1b3830]/30 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-[#1b3830]" />
                  Email / Login
                </label>
                <input
                  type="text"
                  value={odooUser}
                  onChange={(e) => setOdooUser(e.target.value)}
                  placeholder="bchnarowal@gmail.com"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1b3830]/30 text-slate-800"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                <Key className="w-3.5 h-3.5 text-[#1b3830]" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={odooPass}
                  onChange={(e) => setOdooPass(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1b3830]/30 pr-10 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Wipe Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={wipeOldData}
                onChange={(e) => setWipeOldData(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#1b3830] focus:ring-[#1b3830]"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Pehle puraane POS data ko wipe karein (Recommended)
                </span>
                <span className="text-[11px] text-slate-500">
                  Is se SQLite local DB saaf ho kar Odoo ka bilkul taaza data 100% load hoga.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || isSyncing}
            className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Wifi className={`w-3.5 h-3.5 text-slate-500 ${isTesting ? 'animate-pulse' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          {/* Sync / Submit Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-lg bg-[#1b3830] hover:bg-[#142e27] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (syncStatusText || 'Syncing...') : 'Start Full Sync'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
