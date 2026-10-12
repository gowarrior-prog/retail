'use client';
import { create } from 'zustand';
import { sanitizeText, sanitizeBarcode, sanitizePhone, sanitizeUrl } from '@/lib/sanitize';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  quantity: number;
  image_url: string | null;
  sku: string;
  category: string;
  discount: number; // percentage
}

export interface HeldBill {
  id: string;
  timestamp: string;
  items: CartItem[];
  orderNote?: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
}

interface CartState {
  items: CartItem[];
  taxRate: number;
  globalDiscount: number;
  tenderedAmount: string;
  orderNote: string;
  giftReceipt: boolean;
  emailCopy: boolean;
  customerName: string;
  customerPhone: string;
  paymentMode: string;
  cashierName: string;
  storeId: string;
  heldBills: HeldBill[];
  // Computed
  subtotal: () => number;
  discountTotal: () => number;
  taxTotal: () => number;
  grandTotal: () => number;
  changeDue: () => number;
  totalProfit: () => number;
  itemCount: () => number;
  // Actions
  setItems: (items: CartItem[]) => void;
  addItem: (product: any, customQty?: number) => void;
  addMultipleItems: (items: any[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updatePrice: (id: string, price: number) => void;
  setItemDiscount: (id: string, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  setTenderedAmount: (amount: string) => void;
  setOrderNote: (note: string) => void;
  setGiftReceipt: (v: boolean) => void;
  setEmailCopy: (v: boolean) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setPaymentMode: (mode: string) => void;
  setCashierName: (name: string) => void;
  clearCart: () => void;
  holdCurrentOrder: () => boolean;
  restoreHeldOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  taxRate: 0,
  globalDiscount: 0,
  tenderedAmount: '',
  orderNote: '',
  giftReceipt: false,
  emailCopy: false,
  customerName: '',
  customerPhone: '',
  paymentMode: 'CASH',
  cashierName: 'Admin',
  storeId: 'store-1',
  heldBills: [],

  subtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  discountTotal: () => {
    const items = get().items;
    const itemDiscounts = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity * (item.discount || 0) / 100);
    }, 0);
    const subAfterItemDisc = get().subtotal() - itemDiscounts;
    const globalDisc = subAfterItemDisc * (get().globalDiscount || 0) / 100;
    return itemDiscounts + globalDisc;
  },

  taxTotal: () => {
    // Taxes permanently set to 0 as requested
    return 0;
  },

  grandTotal: () => {
    // Grand Total is purely Subtotal minus Discount. No Taxes!
    return Math.max(0, get().subtotal() - get().discountTotal());
  },

  changeDue: () => {
    const tendered = parseFloat(get().tenderedAmount) || 0;
    return Math.max(0, tendered - get().grandTotal());
  },

  totalProfit: () => {
    return get().items.reduce((sum, item) => {
      const profit = ((item.price || 0) - (item.cost_price || 0)) * item.quantity;
      const disc = (item.price || 0) * item.quantity * (item.discount || 0) / 100;
      return sum + profit - disc;
    }, 0);
  },

  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

  setItems: (items: CartItem[]) => set({ items }),

  addItem: (product: any, customQty: number = 1) => set((state: CartState) => {
    const qtyToAdd = Math.max(1, customQty);
    const existing = state.items.find(i => i.id === product.id);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
        ),
      };
    }
    return {
      items: [...state.items, {
        id: product.id,
        name: sanitizeText(product.name || 'Unnamed Item'),
        price: product.price || 0,
        cost_price: product.cost_price || 0,
        quantity: qtyToAdd,
        image_url: sanitizeUrl(product.image_url),
        sku: sanitizeBarcode(product.barcode || product.sku || (product.id ? product.id.slice(0, 8) : 'SKU-NEW')),
        category: sanitizeText(product.category || 'General'),
        discount: 0,
      }],
    };
  }),

  addMultipleItems: (newItems: any[]) => set((state: CartState) => {
    let currentItems: CartItem[] = [...state.items];
    for (const item of newItems) {
      const p = item.product || item;
      const qty = Math.max(1, item.quantity || p.quantity || 1);
      const existingIdx = currentItems.findIndex(i => i.id === p.id || (p.sku && i.sku === p.sku));
      const existing = existingIdx >= 0 ? currentItems[existingIdx] : undefined;
      if (existing) {
        currentItems[existingIdx] = {
          id: existing.id,
          name: existing.name,
          price: existing.price,
          cost_price: existing.cost_price,
          quantity: existing.quantity + qty,
          image_url: existing.image_url,
          sku: existing.sku,
          category: existing.category,
          discount: existing.discount,
        };
      } else {
        currentItems.push({
          id: String(p.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
          name: sanitizeText(p.name || 'Fabric Item'),
          price: Number(p.price || 0),
          cost_price: Number(p.cost_price || 0),
          quantity: qty,
          image_url: sanitizeUrl(p.image_url),
          sku: sanitizeBarcode(p.barcode || p.sku || 'SKU-NL'),
          category: sanitizeText(p.category || 'General'),
          discount: 0,
        });
      }
    }
    return { items: currentItems };
  }),

  removeItem: (id: string) => set((state: CartState) => ({
    items: state.items.filter(i => i.id !== id),
  })),

  updateQuantity: (id: string, qty: number) => set((state: CartState) => ({
    items: qty <= 0
      ? state.items.filter(i => i.id !== id)
      : state.items.map(i => i.id === id ? { ...i, quantity: qty } : i),
  })),

  updatePrice: (id: string, price: number) => set((state: CartState) => ({
    items: state.items.map(i => i.id === id ? { ...i, price: Math.max(0, price) } : i),
  })),

  setItemDiscount: (id: string, discount: number) => set((state: CartState) => ({
    items: state.items.map(i => i.id === id ? { ...i, discount: Math.max(0, Math.min(100, discount)) } : i),
  })),

  setGlobalDiscount: (discount: number) => set({ globalDiscount: Math.max(0, Math.min(100, discount)) }),
  setTaxRate: (rate: number) => set({ taxRate: 0 }),
  setTenderedAmount: (amount: string) => set({ tenderedAmount: amount }),
  setOrderNote: (note: string) => set({ orderNote: sanitizeText(note) }),
  setGiftReceipt: (v: boolean) => set({ giftReceipt: v }),
  setEmailCopy: (v: boolean) => set({ emailCopy: v }),
  setCustomerName: (name: string) => set({ customerName: sanitizeText(name) }),
  setCustomerPhone: (phone: string) => set({ customerPhone: sanitizePhone(phone) }),
  setPaymentMode: (mode: string) => set({ paymentMode: sanitizeBarcode(mode) }),
  setCashierName: (name: string) => set({ cashierName: sanitizeText(name) }),
  clearCart: () => set({ items: [], globalDiscount: 0, tenderedAmount: '', orderNote: '', customerName: '', customerPhone: '' }),

  holdCurrentOrder: () => {
    const state = get();
    if (state.items.length === 0) return false;
    const newHold: HeldBill = {
      id: `HOLD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [...state.items],
      orderNote: state.orderNote,
      customerName: state.customerName,
      customerPhone: state.customerPhone,
      total: state.grandTotal(),
    };
    set({
      heldBills: [newHold, ...state.heldBills],
      items: [],
      orderNote: '',
      customerName: '',
      customerPhone: '',
      tenderedAmount: '',
      globalDiscount: 0,
    });
    return true;
  },

  restoreHeldOrder: (id: string) => {
    const state = get();
    const target = state.heldBills.find((h) => h.id === id);
    if (!target) return;
    set({
      items: target.items,
      orderNote: target.orderNote || '',
      customerName: target.customerName || '',
      customerPhone: target.customerPhone || '',
      heldBills: state.heldBills.filter((h) => h.id !== id),
    });
  },

  deleteHeldOrder: (id: string) => {
    set((state: CartState) => ({
      heldBills: state.heldBills.filter((h) => h.id !== id),
    }));
  },
}));
