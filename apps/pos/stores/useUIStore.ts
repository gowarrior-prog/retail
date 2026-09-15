'use client';
import { create } from 'zustand';

type ActivePage = 'checkout' | 'inventory' | 'analytics' | 'employees';

interface UIState {
  activePage: ActivePage;
  isSyncing: boolean;
  isOnline: boolean;
  heldOrdersCount: number;
  sidebarOpen: boolean;
  setActivePage: (page: ActivePage) => void;
  setSyncing: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  setHeldOrdersCount: (count: number) => void;
  setSidebarOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePage: 'checkout',
  isSyncing: false,
  isOnline: true,
  heldOrdersCount: 0,
  sidebarOpen: false,
  setActivePage: (page) => set({ activePage: page }),
  setSyncing: (v) => set({ isSyncing: v }),
  setOnline: (v) => set({ isOnline: v }),
  setHeldOrdersCount: (count) => set({ heldOrdersCount: count }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
