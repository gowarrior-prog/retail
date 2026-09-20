'use client';
import { create } from 'zustand';
import { fetchProducts, saveLocalProductCache, getLocalProductCache, type Product } from '@/lib/api';

interface ProductState {
  products: Product[];
  filteredProducts: Product[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
  loadProducts: (force?: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
  addProduct: (product: Product) => void;
  updateProductInStore: (id: string, product: Product) => void;
  removeProductFromStore: (id: string) => void;
}

const getInitialProducts = (): Product[] => {
  if (typeof window === 'undefined') return [];
  return getLocalProductCache();
};

const initialItems = getInitialProducts();

export const useProductStore = create<ProductState>((set, get) => ({
  products: initialItems,
  filteredProducts: initialItems,
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: initialItems.length === 0,
  error: null,

  loadProducts: async (force = false) => {
    const { products } = get();
    if (products.length === 0) {
      const cached = getLocalProductCache();
      if (cached.length > 0) {
        set({ products: cached, filteredProducts: cached, isLoading: false });
      }
    }

    try {
      const liveProducts = await fetchProducts();
      if (Array.isArray(liveProducts) && liveProducts.length > 0) {
        set({ products: liveProducts, filteredProducts: liveProducts, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.warn('[Store] loadProducts background sync:', err);
      set({ isLoading: false });
    }
  },

  addProduct: (product: Product) => {
    const { products, selectedCategory, searchQuery } = get();
    const updated = [product, ...products.filter(p => p.id !== product.id)];
    saveLocalProductCache(updated);

    const q = searchQuery.toLowerCase().trim();
    const filtered = updated.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    set({ products: updated, filteredProducts: filtered });
  },

  updateProductInStore: (id: string, product: Product) => {
    const { products, selectedCategory, searchQuery } = get();
    const updated = products.map(p => p.id === id ? { ...p, ...product } : p);
    saveLocalProductCache(updated);

    const q = searchQuery.toLowerCase().trim();
    const filtered = updated.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    set({ products: updated, filteredProducts: filtered });
  },

  removeProductFromStore: (id: string) => {
    const { products, selectedCategory, searchQuery } = get();
    const updated = products.filter(p => p.id !== id);
    saveLocalProductCache(updated);

    const q = searchQuery.toLowerCase().trim();
    const filtered = updated.filter(p => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    set({ products: updated, filteredProducts: filtered });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    const { products, selectedCategory } = get();
    const q = query.toLowerCase().trim();
    set({
      filteredProducts: products.filter(p => {
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q));
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    });
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    const { products, searchQuery } = get();
    const q = searchQuery.toLowerCase().trim();
    set({
      filteredProducts: products.filter(p => {
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q));
        const matchesCategory = category === 'All' || p.category === category;
        return matchesSearch && matchesCategory;
      }),
    });
  },
}));
