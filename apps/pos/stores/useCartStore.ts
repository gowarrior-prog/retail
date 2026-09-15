'use client';
import { create } from 'zustand';

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

interface CartState {
  items: CartItem[];
  taxRate: number;
  globalDiscount: number;
  tenderedAmount: string;
  giftReceipt: boolean;
  emailCopy: boolean;
  customerName: string;
  customerPhone: string;
  paymentMode: string;
  cashierName: string;
  storeId: string;
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
  addItem: (product: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  updatePrice: (id: string, price: number) => void;
  setItemDiscount: (id: string, discount: number) => void;
  setGlobalDiscount: (discount: number) => void;
  setTaxRate: (rate: number) => void;
  setTenderedAmount: (amount: string) => void;
  setGiftReceipt: (v: boolean) => void;
  setEmailCopy: (v: boolean) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setPaymentMode: (mode: string) => void;
  setCashierName: (name: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  taxRate: 15,
  globalDiscount: 0,
  tenderedAmount: '',
  giftReceipt: false,
  emailCopy: false,
  customerName: '',
  customerPhone: '',
  paymentMode: 'CASH',
  cashierName: 'Admin',
  storeId: 'store-1',

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
    const afterDiscount = get().subtotal() - get().discountTotal();
    return (afterDiscount * (get().taxRate || 0)) / 100;
  },

  grandTotal: () => {
    return Math.max(0, get().subtotal() - get().discountTotal() + get().taxTotal());
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

  addItem: (product: any) => set((state: CartState) => {
    const existing = state.items.find(i => i.id === product.id);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };
    }
    return {
      items: [...state.items, {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        cost_price: product.cost_price || 0,
        quantity: 1,
        image_url: product.image_url || null,
        sku: product.barcode || product.sku || (product.id ? product.id.slice(0, 8) : 'SKU-NEW'),
        category: product.category || 'General',
        discount: 0,
      }],
    };
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
  setTaxRate: (rate: number) => set({ taxRate: Math.max(0, rate) }),
  setTenderedAmount: (amount: string) => set({ tenderedAmount: amount }),
  setGiftReceipt: (v: boolean) => set({ giftReceipt: v }),
  setEmailCopy: (v: boolean) => set({ emailCopy: v }),
  setCustomerName: (name: string) => set({ customerName: name }),
  setCustomerPhone: (phone: string) => set({ customerPhone: phone }),
  setPaymentMode: (mode: string) => set({ paymentMode: mode }),
  setCashierName: (name: string) => set({ cashierName: name }),
  clearCart: () => set({ items: [], globalDiscount: 0, tenderedAmount: '', customerName: '', customerPhone: '' }),
}));
