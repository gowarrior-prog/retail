'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, ShieldAlert, KeyRound, Unlock, AlertCircle, Clock } from 'lucide-react';

interface InactivityScreenLockProps {
  timeoutMs?: number; // Defaults to 5 minutes (300,000 ms)
}

export default function InactivityScreenLock({ timeoutMs = 5 * 60 * 1000 }: InactivityScreenLockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [lockedAt, setLockedAt] = useState<Date | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lock function
  const lockScreen = useCallback(() => {
    setIsLocked(true);
    setPin('');
    setErrorMsg('');
    setLockedAt(new Date());
  }, []);

  // Reset activity timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLocked) {
      timerRef.current = setTimeout(() => {
        lockScreen();
      }, timeoutMs);
    }
  }, [isLocked, lockScreen, timeoutMs]);

  // Global activity listener
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true }));
    resetTimer();

    // Listen for explicit manual lock events
    const handleManualLock = () => lockScreen();
    window.addEventListener('pos-lock-screen', handleManualLock);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      window.removeEventListener('pos-lock-screen', handleManualLock);
    };
  }, [resetTimer, lockScreen]);

  // Validate entered PIN
  const handleVerifyPin = useCallback((enteredPin: string) => {
    // Verified PINs: Default '1234' or saved cashier PIN
    const storedPin = typeof window !== 'undefined' ? localStorage.getItem('pos_cashier_pin') || '1234' : '1234';
    const cleanEntered = enteredPin.trim();

    if (cleanEntered === storedPin || cleanEntered === '1234') {
      setIsLocked(false);
      setPin('');
      setErrorMsg('');
      setLockedAt(null);
      resetTimer();
    } else {
      setErrorMsg('Ghalat PIN! Baraye meherbani durust 4-digit PIN darj karein.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  }, [resetTimer]);

  // Keypad press handler
  const handleKeypadPress = (val: string) => {
    setErrorMsg('');
    if (val === 'CLEAR') {
      setPin('');
    } else if (val === 'BACK') {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === 'ENTER') {
      if (pin.length > 0) {
        handleVerifyPin(pin);
      }
    } else {
      if (pin.length < 6) {
        const next = pin + val;
        setPin(next);
        if (next.length === 4) {
          handleVerifyPin(next);
        }
      }
    }
  };

  // Keyboard listener while locked
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeypadPress('BACK');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleKeypadPress('ENTER');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleKeypadPress('CLEAR');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, handleKeypadPress]);

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl select-none animate-in fade-in duration-300">
      <div
        className={`w-full max-w-sm mx-4 bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center backdrop-blur-md transition-transform ${
          isShaking ? 'animate-bounce text-rose-300' : ''
        }`}
      >
        {/* Lock Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white tracking-wide uppercase font-mono">
          BILAL CLOTH HOUSE
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Screen Locked due to inactivity (5 min)</span>
        </p>

        {lockedAt && (
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Locked at: {lockedAt.toLocaleTimeString()}
          </p>
        )}

        {/* PIN Display Dots */}
        <div className="my-6">
          <div className="flex justify-center items-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-amber-400 border-amber-400 scale-125 shadow-lg shadow-amber-400/50'
                    : 'border-slate-600 bg-slate-800/80'
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-400 font-semibold animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadPress(digit)}
              className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700/60 text-white font-mono text-lg font-bold shadow-md transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleKeypadPress('CLEAR')}
            className="h-12 rounded-2xl bg-slate-800/50 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 active:scale-95 border border-slate-700/60 font-mono text-xs font-bold transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            className="h-12 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700/60 text-white font-mono text-lg font-bold shadow-md transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('ENTER')}
            className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 border border-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-1"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </div>

        {/* Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
          <span>Default Cashier PIN: <strong>1234</strong></span>
        </div>
      </div>
    </div>
  );
}
