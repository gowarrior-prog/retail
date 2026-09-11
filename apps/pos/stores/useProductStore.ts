'use client';
import { create } from 'zustand';
import { fetchProducts, type Product } from '@/lib/api';

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Banarasi Silk Embroidered Suit (3-Piece)',
    price: 4500,
    cost_price: 2800,
    profit_margin: 37.7,
    category: 'Silk Collection',
    image_url: null,
    stock: 24,
    barcode: '8901234567890',
    odoo_id: 101,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    name: 'Pure Crinkle Chiffon Dupatta (Emerald)',
    price: 1250,
    cost_price: 750,
    profit_margin: 40.0,
    category: 'Accessories',
    image_url: null,
    stock: 45,
    barcode: '8901234567893',
    odoo_id: 102,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-003',
    name: 'Gul Ahmed Premium Lawn Suit (Embroidered)',
    price: 5200,
    cost_price: 3400,
    profit_margin: 34.6,
    category: 'Lawn Collection',
    image_url: null,
    stock: 18,
    barcode: '8901234567891',
    odoo_id: 103,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-004',
    name: "Grace Wash & Wear Men's Fabric (4.5m)",
    price: 3200,
    cost_price: 2100,
    profit_margin: 34.4,
    category: "Men's Fabric",
    image_url: null,
    stock: 32,
    barcode: '8901234567892',
    odoo_id: 104,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-005',
    name: 'Khaadi Printed Cotton Kurti (Stitched)',
    price: 2600,
    cost_price: 1600,
    profit_margin: 38.5,
    category: 'Pret Wear',
    image_url: null,
    stock: 15,
    barcode: '8901234567894',
    odoo_id: 105,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-006',
    name: 'Pashmina Woolen Shawl (Hand Embroidered)',
    price: 5800,
    cost_price: 3700,
    profit_margin: 36.2,
    category: 'Winter Collection',
    image_url: null,
    stock: 12,
    barcode: '8901234567895',
    odoo_id: 106,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-007',
    name: "Al-Karam Classic Boski Silk (Men's Suit)",
    price: 4200,
    cost_price: 2700,
    profit_margin: 35.7,
    category: "Men's Fabric",
    image_url: null,
    stock: 20,
    barcode: '8901234567896',
    odoo_id: 107,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'prod-008',
    name: 'Royal Micro Velvet Shawl (Black & Gold)',
    price: 7200,
    cost_price: 4800,
    profit_margin: 33.3,
    category: 'Winter Collection',
    image_url: null,
    stock: 8,
    barcode: '8901234567897',
    odoo_id: 108,
    store_id: 'store-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface ProductState {
  products: Product[];
  filteredProducts: Product[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCategory: (category: string) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: FALLBACK_PRODUCTS,
  filteredProducts: FALLBACK_PRODUCTS,
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const liveProducts = await fetchProducts();
      if (liveProducts && liveProducts.length > 0) {
        set({ products: liveProducts, filteredProducts: liveProducts, isLoading: false });
      } else {
        set({ products: FALLBACK_PRODUCTS, filteredProducts: FALLBACK_PRODUCTS, isLoading: false });
      }
    } catch (err: any) {
      // Fallback to demo products gracefully so POS remains fully interactive
      set({ products: FALLBACK_PRODUCTS, filteredProducts: FALLBACK_PRODUCTS, error: err.message, isLoading: false });
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
