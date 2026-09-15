'use client';
import { create } from 'zustand';
import { fetchProducts, type Product } from '@/lib/api';

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
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  filteredProducts: [],
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,

  loadProducts: async (force = false) => {
    const { products } = get();
    // Cache-first: If products are already in memory and force refresh is not requested, DO NOT re-fetch!
    if (!force && products.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const liveProducts = await fetchProducts();
      const valid = liveProducts || [];
      set({ products: valid, filteredProducts: valid, isLoading: false });
    } catch (err: any) {
      set({ products: [], filteredProducts: [], error: err.message, isLoading: false });
    }
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
