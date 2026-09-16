'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { syncOdoo, createProduct, updateProduct, deleteProduct, type Product } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

const FABRIC_CATEGORIES = ['All', 'Lawn', 'Cambric', 'Cotton', 'Khaddar', 'Fancy', 'Shawl'] as const;

export default function InventoryPage() {
  const { products, isLoading, loadProducts } = useProductStore();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

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
    image: '',
  });

  // Fast cache-first loading (0ms lag when switching pages!)
  useEffect(() => {
    loadProducts(false);
  }, []);

  const handleSyncOdoo = async () => {
    setIsSyncing(true);
    try {
      await syncOdoo();
      await loadProducts(true);
    } catch (err) {
      console.error('Failed to sync Odoo:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;

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

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

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
      barcode: newProduct.barcode || `${(newProduct.category || 'GEN').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
    };

    try {
      await createProduct(productPayload);
      await loadProducts(true);
    } catch (err: any) {
      console.warn('Product created offline fallback:', err);
      await loadProducts(false);
    }

    setIsAddModalOpen(false);
    setNewProduct({ name: '', category: 'Lawn', price: '', cost_price: '', stock: '', barcode: '',image:'', });
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await updateProduct(editingProduct.id, editingProduct);
      await loadProducts(true);
    } catch (err: any) {
      console.warn('Product updated offline fallback:', err);
      await loadProducts(false);
    }

    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      await loadProducts(true);
    } catch (err: any) {
      console.warn('Product deleted offline fallback:', err);
      await loadProducts(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1600px] mx-auto pb-8">
      {/* Top Controls Header */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-sans">
            <Package className="w-5.5 h-5.5 text-indigo-600" />
            Fabric Inventory Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Manage fabric stock, pricing, category margins, and Odoo ERP sync
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fabric SKU</span>
          </button>

          <button
            onClick={handleSyncOdoo}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-95"
            title="Sync products from Odoo ERP"
          >
            <RefreshCw className={cn('w-4 h-4 text-emerald-600', isSyncing && 'animate-spin')} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Odoo ERP'}</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Fabric SKUs</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{products.length}</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Stock Units</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
              {products.reduce((sum, p) => sum + (p.stock || 0), 0)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-5.5 h-5.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catalog Categories</span>
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{FABRIC_CATEGORIES.length - 1}</span>
          </div>
        </div>
      </div>

      {/* Filter & Category Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 w-4 h-4 pointer-events-none" />
            <input
              className="w-full h-9.5 pl-9.5 pr-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              placeholder="Search fabric title, category, or barcode..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-nowrap">
          {FABRIC_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95',
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100/80 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700'
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm font-medium">Loading fabric catalog...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-medium">No inventory items found. Click "Add Fabric SKU" or "Sync Odoo ERP" to add products.</div>
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
              {paginatedProducts.map((p, idx) => {
                const cost = p.cost_price || Math.round(p.price * 0.65);
                const profit = p.price - cost;
                const margin = p.price > 0 ? ((profit / p.price) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={p.id || `prod-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">{p.barcode || (p.id ? p.id.slice(0, 8) : `SKU-${idx + 1}`)}</td>
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

        {/* Ultra-Fast 60FPS Pagination Controls */}
        {filteredProducts.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Showing <span className="font-bold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</span> of <span className="font-bold text-indigo-700">{filteredProducts.length.toLocaleString()}</span> products
            </span>

            <div className="flex items-center gap-2 font-mono">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:hover:bg-white cursor-pointer active:scale-95"
              >
                ← Previous
              </button>

              <span className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 font-bold text-indigo-700">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 disabled:hover:bg-white cursor-pointer active:scale-95"
              >
                Next →
              </button>
            </div>
          </div>
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
        
        {/* Optional Product Image */}
        <div>
          <label className="block text-slate-600 font-semibold mb-1">
            Product Image <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="flex items-center gap-3">
            {newProduct.image ? (
              <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <img
                  src={newProduct.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setNewProduct({ ...newProduct, image: '' })}
                  className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-0.5 shadow"
                >
                  <X className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            ) : (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                <span className="text-[10px] text-slate-400 font-medium">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewProduct({ ...newProduct, image: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            )}
            <div className="text-[11px] text-slate-400 leading-tight">
              JPG, PNG recommended<br />
              Max 2MB
            </div>
          </div>
        </div>

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
