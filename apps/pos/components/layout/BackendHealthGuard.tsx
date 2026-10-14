'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Server, AlertCircle, CheckCircle2, Wifi, ArrowRight } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, discoverLocalServer } from '@/lib/api/client';

interface BackendHealthGuardProps {
  children: React.ReactNode;
}

export default function BackendHealthGuard({ children }: BackendHealthGuardProps) {
  const [isReady, setIsReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');
  const [customIp, setCustomIp] = useState('');
  const [statusMessage, setStatusMessage] = useState('Starting Bilal Cloth POS Backend Engine...');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryMsg, setDiscoveryMsg] = useState('');

  const checkHealth = useCallback(async (): Promise<boolean> => {
    const url = getApiBaseUrl();
    setCurrentUrl(url);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${url}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return true;
      }
    } catch {
      // Still booting or not reached yet
    }
    return false;
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let pollInterval: NodeJS.Timeout;

    const runStartupCheck = async () => {
      // First quick check
      const online = await checkHealth();
      if (online) {
        if (!isCancelled) {
          setIsReady(true);
        }
        return;
      }

      // Retry loop: poll every 500ms
      let count = 0;
      pollInterval = setInterval(async () => {
        if (isCancelled) return;
        count++;
        setAttempt(count);

        if (count < 6) {
          setStatusMessage('Spawning local FastAPI backend sidecar...');
        } else if (count < 14) {
          setStatusMessage('Initializing offline SQLite database and security tables...');
        } else if (count === 14) {
          setStatusMessage('Scanning local network and alternative ports...');
          // Trigger silent auto-discovery
          discoverLocalServer().then((res) => {
            if (res.success && !isCancelled) {
              setDiscoveryMsg(res.message);
            }
          });
        } else {
          setStatusMessage('Waiting for server response (Port 8000)...');
        }

        const isUp = await checkHealth();
        if (isUp) {
          clearInterval(pollInterval);
          if (!isCancelled) {
            setIsReady(true);
          }
        }
      }, 500);
    };

    runStartupCheck();

    return () => {
      isCancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [checkHealth]);

  const handleManualRetry = async () => {
    setStatusMessage('Re-testing connection...');
    const isUp = await checkHealth();
    if (isUp) {
      setIsReady(true);
    }
  };

  const handleAutoDiscover = async () => {
    setIsDiscovering(true);
    setDiscoveryMsg('Scanning local network for Bilal POS Main Shop Server...');
    const res = await discoverLocalServer();
    setIsDiscovering(false);
    setDiscoveryMsg(res.message);
    if (res.success) {
      setCurrentUrl(res.url);
      setIsReady(true);
    }
  };

  const handleApplyCustomIp = async () => {
    if (!customIp.trim()) return;
    setApiBaseUrl(customIp.trim());
    setCurrentUrl(getApiBaseUrl());
    const isUp = await checkHealth();
    if (isUp) {
      setIsReady(true);
    } else {
      setDiscoveryMsg(`Could not connect to ${customIp.trim()}. Verify the server is running.`);
    }
  };

  // If backend is ready, render the full POS UI seamlessly
  if (isReady) {
    return <>{children}</>;
  }

  // Graceful bootup loading & diagnostic splash
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white select-none">
      <div className="w-full max-w-lg p-8 mx-4 bg-slate-800/90 rounded-3xl shadow-2xl border border-slate-700/80 backdrop-blur-xl animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Server className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-white font-mono">
              BILAL CLOTH & SILK CENTER
            </h1>
            <p className="text-xs text-amber-400 font-semibold tracking-wider uppercase">
              Retail POS Terminal — Engine Startup
            </p>
          </div>
        </div>

        {/* Pulse Bar / Status */}
        <div className="space-y-4 my-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>{statusMessage}</span>
            </span>
            <span className="font-mono text-slate-500">{attempt > 0 ? `Retry #${attempt}` : 'Checking'}</span>
          </div>

          <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full animate-pulse w-3/4" />
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Target Server:</span>
            <span className="text-amber-300 font-semibold">{currentUrl || 'http://localhost:8000'}</span>
          </div>
        </div>

        {/* Extended troubleshooting controls if startup takes > 6 seconds */}
        {attempt >= 12 && (
          <div className="mt-6 pt-6 border-t border-slate-700/60 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Backend initialization taking a moment</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The local Python sidecar is booting up or initializing local SQLite tables. If this is a secondary network PC, connect to the primary shop server.
                </p>
              </div>
            </div>

            {discoveryMsg && (
              <p className="text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 p-2.5 rounded-lg">
                {discoveryMsg}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleManualRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Check
              </button>
              <button
                onClick={handleAutoDiscover}
                disabled={isDiscovering}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition disabled:opacity-60"
              >
                <Wifi className="w-3.5 h-3.5" />
                {isDiscovering ? 'Scanning LAN...' : 'Auto-Discover LAN'}
              </button>
            </div>

            {/* Custom IP input for 2nd PC in LAN */}
            <div className="pt-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Connecting from 2nd PC? Enter Main Shop Server IP:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 192.168.100.70:8000"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleApplyCustomIp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 transition"
                >
                  <span>Connect</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
