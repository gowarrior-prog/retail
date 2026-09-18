'use client';
import { create } from 'zustand';
import { fetchProducts, saveLocalProductCache, type Product } from '@/lib/api';

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

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  filteredProducts: [],
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,

  loadProducts: async (force = false) => {
    const { products } = get();
    // Cache-first: If products are already loaded in memory and force refresh is false, keep existing items
    if (!force && products.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const liveProducts = await fetchProducts();
      if (Array.isArray(liveProducts) && liveProducts.length > 0) {
        set({ products: liveProducts, filteredProducts: liveProducts, isLoading: false });
      } else if (products.length > 0) {
        // Backend returned empty or failed; retain current non-empty in-memory products
        set({ isLoading: false });
      } else {
        set({ products: [], filteredProducts: [], isLoading: false });
      }
    } catch (err: any) {
      console.warn('[Store] loadProducts catch error, retaining current products:', err);
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
