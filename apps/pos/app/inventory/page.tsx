'use client';

import React, { useState, useEffect } from 'react';
import { useProductStore } from '@/stores/useProductStore';
import { deleteProduct } from '@/lib/api';
import CatalogTopBar from '@/components/inventory/CatalogTopBar';
import CatalogGrid from '@/components/inventory/CatalogGrid';
import AddClothDrawerModal from '@/components/inventory/AddClothDrawerModal';
import EditClothDrawerModal from '@/components/inventory/EditClothDrawerModal';
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal';
import { showCatalogToast } from '@/lib/toast';

export default function CatalogPage() {
  const { products, loadProducts, removeProductFromStore } = useProductStore();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddDrawer, setShowAddDrawer] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  const deletingProduct = deletingProductId ? products.find((p) => p.id === deletingProductId) : null;

  const handleConfirmDelete = async () => {
    if (!deletingProductId) return;
    const targetId = deletingProductId;
    setDeletingProductId(null);
    showCatalogToast('✓ Product Deleted Successfully', 'delete');
    removeProductFromStore(targetId);
    deleteProduct(targetId).catch(() => {});
  };

  return (
    <div className="flex-1 flex flex-col p-4 bg-[#f4f7f5] overflow-y-auto font-sans relative min-w-0 space-y-4">
      <CatalogTopBar
        onOpenAddDrawer={() => setShowAddDrawer(true)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <CatalogGrid
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSelectProduct={(p) => setEditingProduct(p)}
          onDeleteProduct={(id) => setDeletingProductId(id)}
        />
      </div>

      {showAddDrawer && (
        <AddClothDrawerModal onClose={() => setShowAddDrawer(false)} />
      )}

      {editingProduct && (
        <EditClothDrawerModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {deletingProductId && (
        <DeleteConfirmModal
          productName={deletingProduct?.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingProductId(null)}
        />
      )}
    </div>
  );
}
