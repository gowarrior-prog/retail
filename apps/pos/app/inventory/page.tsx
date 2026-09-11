'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  ShoppingCart,
  Check,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { fetchProducts, syncOdoo, createProduct, updateProduct, deleteProduct, type Product } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

const FABRIC_CATEGORIES = ['All', 'Lawn', 'Cambric', 'Cotton', 'Khaddar', 'Fancy', 'Shawl'] as const;

export default function InventoryPage() {
  const { addItem } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [addedItemMap, setAddedItemMap] = useState<Record<string, boolean>>({});

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Lawn',
    price: '',
    cost_price: '',
    stock: '',
    barcode: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncOdoo = async () => {
    setIsSyncing(true);
    try {
      await syncOdoo();
      await loadData();
    } catch (err) {
      console.error('Failed to sync Odoo:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      cost_price: product.cost_price || 0,
      image_url: null,
      barcode: product.barcode,
      category: product.category,
    });

    setAddedItemMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1000);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newProduct.price) || 0;
    const costNum = parseFloat(newProduct.cost_price) || Math.round(priceNum * 0.65);
    const stockNum = parseInt(newProduct.stock, 10) || 0;
    const margin = priceNum > 0 ? Number((((priceNum - costNum) / priceNum) * 100).toFixed(1)) : 0;

    const productPayload: Partial<Product> = {
      name: newProduct.name,
      price: priceNum,
      cost_price: costNum,
      profit_margin: margin,
      category: newProduct.category,
      stock: stockNum,
      barcode: newProduct.barcode || `${newProduct.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    };

    try {
      const saved = await createProduct(productPayload);
      setProducts((prev) => [saved, ...prev]);
    } catch {
      setProducts((prev) => [{ id: `prod-${Date.now()}`, ...productPayload } as Product, ...prev]);
    }

    setIsAddModalOpen(false);
    setNewProduct({ name: '', category: 'Lawn', price: '', cost_price: '', stock: '', barcode: '' });
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const updated = await updateProduct(editingProduct.id, editingProduct);
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
    } catch {
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? editingProduct : p)));
    }

    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product from DB1?')) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Controls Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-700" />
            Inventory & Fabric Catalog (DB1)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Bilal Cloth & Silk Center — Main Bazar Narowal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Fabric SKU</span>
          </button>

          <button
            onClick={handleSyncOdoo}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Sync products from Odoo ERP into DB1"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-slate-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing Odoo...' : 'Sync Odoo ERP'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Category Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
              placeholder="Search fabric title, category, or barcode..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-nowrap">
          {FABRIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Table (Full DB1 CRUD Support) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-mono">Loading inventory catalog from DB1...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No products found in DB1 database. Click "Add Fabric SKU" or "Sync Odoo ERP" to populate catalog.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase font-mono">
              <tr>
                <th className="p-3">SKU / Barcode</th>
                <th className="p-3">Fabric Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Sale Price</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Margin %</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {filteredProducts.map((p) => {
                const cost = p.cost_price || Math.round(p.price * 0.65);
                const profit = p.price - cost;
                const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : '0.0';
                const isAdded = addedItemMap[p.id];

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{p.barcode || p.id.slice(0, 8)}</td>
                    <td className="p-3 font-sans font-bold text-slate-900">{p.name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {p.category || 'Fabric'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(p.price)}</td>
                    <td className="p-3 text-right text-slate-500">{formatCurrency(cost)}</td>
                    <td className="p-3 text-right font-bold text-slate-800">+{margin}%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-800">
                        {p.stock || 0} Units
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleAddToCart(p)}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1',
                            isAdded ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                          )}
                          title="Add to active POS cart"
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                          <span>{isAdded ? 'Added' : 'Add'}</span>
                        </button>

                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                          title="Edit Product in DB1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200"
                          title="Delete Product from DB1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Add New Fabric SKU to DB1</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="flex flex-col gap-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Fabric Title</label>
                <input
                  required
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                  placeholder="e.g. Gul Ahmed Printed Lawn 3pc"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category</label>
                  <select
                    className="w-full h-8 px-2 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    {FABRIC_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Barcode / SKU</label>
                  <input
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    placeholder="LWN-GA-001"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sale Price</label>
                  <input
                    required
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    placeholder="6850"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Cost Price</label>
                  <input
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    placeholder="4350"
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Initial Stock</label>
                  <input
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    placeholder="25"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Save Product to DB1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Edit Product (DB1)</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="flex flex-col gap-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Fabric Title</label>
                <input
                  required
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category</label>
                  <input
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Barcode / SKU</label>
                  <input
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sale Price</label>
                  <input
                    required
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Cost Price</label>
                  <input
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    value={editingProduct.cost_price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Stock Units</label>
                  <input
                    type="number"
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none font-mono"
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-slate-900 text-white font-bold hover:bg-slate-800"
                >
                  Update Product in DB1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
