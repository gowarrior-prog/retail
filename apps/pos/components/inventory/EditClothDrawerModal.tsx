'use client';

import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import { useProductStore } from '@/stores/useProductStore';
import { updateProduct, deleteProduct, uploadProductImage } from '@/lib/api';
import { showCatalogToast } from '@/lib/toast';
import { showProfessionalAlert } from '@/lib/alert';
import BarcodePrinterModal from './BarcodePrinterModal';
import AnimatedSelect from './AnimatedSelect';
import DeleteConfirmModal from './DeleteConfirmModal';

interface EditClothDrawerModalProps {
  product: any;
  onClose: () => void;
  onDeleteSuccess?: (msg: string) => void;
}

const CATEGORY_OPTIONS = [
  { label: 'Cotton Latha', value: 'Cotton Latha' },
  { label: 'Unstitched Lawn', value: 'Unstitched Lawn' },
  { label: 'Shawls & Wool', value: 'Shawls & Wool' },
  { label: 'Pure Boski', value: 'Pure Boski' },
  { label: 'Banarasi Brocade', value: 'Banarasi Brocade' },
  { label: 'Wash & Wear', value: 'Wash & Wear' },
  { label: 'Kurta & Shalwar', value: 'Kurta & Shalwar' },
];

const UNIT_OPTIONS = [
  { label: 'Select Unit (Optional)', value: '' },
  { label: 'Suit (4.5m)', value: 'Suit (4.5m)' },
  { label: 'Suit (7m)', value: 'Suit (7m)' },
  { label: 'Per Meter', value: 'Per Meter' },
  { label: 'Roll / Thaan', value: 'Roll / Thaan' },
];

export default function EditClothDrawerModal({ product, onClose }: EditClothDrawerModalProps) {
  const { updateProductInStore, removeProductFromStore } = useProductStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState(product.name || '');
  const [category, setCategory] = useState(product.category || 'Cotton Latha');
  const [unit, setUnit] = useState('');
  const [sku, setSku] = useState(product.sku || product.barcode || `SKU-${Date.now().toString().slice(-6)}`);
  const [costPrice, setCostPrice] = useState<number>(product.cost_price || 4500);
  const [retailPrice, setRetailPrice] = useState<number>(product.price || 6500);
  const [stock, setStock] = useState<number>(product.stock ?? 20);
  const [imageUrl, setImageUrl] = useState<string>(product.image_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const handleAnimatedClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    setTimeout(() => onClose(), 300);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadProductImage(file);
      if (url) setImageUrl(url);
    } catch {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) setImageUrl(evt.target.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateCloth = async () => {
    if (!title.trim()) {
      showProfessionalAlert('Please enter a cloth / fabric title.', 'Title Required');
      return;
    }
    setIsSubmitting(true);
    const updatePayload = { name: title.trim(), price: retailPrice, cost_price: costPrice, category, sku, barcode: sku, stock, image_url: imageUrl || null };

    try {
      const res = await updateProduct(product.id, updatePayload);
      updateProductInStore(product.id, res);
      handleAnimatedClose();
    } catch {
      updateProductInStore(product.id, { ...product, ...updatePayload });
      handleAnimatedClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    showCatalogToast('✓ Product Deleted Successfully', 'delete');
    removeProductFromStore(product.id);
    handleAnimatedClose();
    deleteProduct(product.id).catch(() => {});
  };

  return (
    <>
      <div onClick={handleAnimatedClose} className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end font-sans transition-opacity duration-300 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0'}`}>
        <div onClick={(e) => e.stopPropagation()} className={`w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden transition-transform duration-300 ease-out ${isOpen && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm leading-none">Edit Product Details</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Update cloth specs, pricing or stock</p>
            </div>
            <button onClick={handleAnimatedClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 min-h-0">
            <div>
              <label className="text-[10.5px] font-bold text-slate-600 block mb-1">Cloth Picture / Image</label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-3 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-center overflow-hidden cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {imageUrl ? (
                  <img src={imageUrl} alt="Uploaded fabric" className="h-24 w-full object-cover rounded-xl" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700">{isUploading ? 'Uploading...' : 'Click to change fabric image'}</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Cloth / Fabric Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <AnimatedSelect
                label="Fabric Category *"
                options={CATEGORY_OPTIONS}
                value={category}
                onChange={setCategory}
              />
              <AnimatedSelect
                label="Unit (Optional)"
                options={UNIT_OPTIONS}
                value={unit}
                onChange={setUnit}
                placeholder="Select Unit"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Barcode / SKU *</label>
              <div className="flex gap-2">
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900" />
                <button type="button" onClick={() => setShowPrintModal(true)} className="px-4 py-2 bg-[#e0e3e2] hover:bg-[#d4d4d4] active:scale-[0.99] text-black rounded-xl text-xs font-extrabold shadow-2xs cursor-pointer transition">
                  Create
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase font-mono block">PRICING & MARGINS (PKR)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Cost Price</label>
                  <input type="number" value={costPrice} onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Retail Price</label>
                  <input type="number" value={retailPrice} onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-700 block mb-1">Stock Qty *</label>
              <input type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900" />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button onClick={() => setShowDeleteConfirm(true)} className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={handleUpdateCloth} disabled={isSubmitting} className="px-5 py-2.5 bg-[#1b3830] hover:bg-[#142e27] active:scale-[0.99] text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow cursor-pointer">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Updating...' : 'Update Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <BarcodePrinterModal
          product={{ name: title || product.name, sku, barcode: sku, price: retailPrice }}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmModal
          productName={title || product.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
