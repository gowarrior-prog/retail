import { z } from 'zod';
import { apiFetch, getApiBaseUrl } from './client';
import { ProductSchema, ProductCreateSchema } from '../validators';

export type Product = z.infer<typeof ProductSchema>;

export async function fetchProducts(): Promise<Product[]> {
  try {
    const raw = await apiFetch<any[]>('/products');
    if (Array.isArray(raw)) {
      return z.array(ProductSchema.partial()).parse(raw) as Product[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  const apiBase = getApiBaseUrl();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${apiBase}/upload-image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Image upload failed');
  }

  const data = await res.json();
  return data.image_url || data.url || data.file_path || '';
}

export async function createProduct(data: any): Promise<Product> {
  let validated: any;
  try {
    validated = ProductCreateSchema.parse(data);
  } catch {
    validated = {
      id: data.id,
      name: data.name || 'Fabric Item',
      price: parseFloat(data.price) || 0,
      cost_price: parseFloat(data.cost_price) || 0,
      profit_margin: parseFloat(data.profit_margin) || 0,
      category: data.category || 'General',
      image_url: data.image_url || null,
      stock: parseInt(data.stock, 10) || 0,
      barcode: data.barcode || null,
      sku: data.sku || `SKU-${Date.now().toString().slice(-6)}`,
    };
  }

  const res = await apiFetch<any>('/products', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
  return ProductSchema.parse(res);
}

export async function updateProduct(id: string, data: any): Promise<Product> {
  const res = await apiFetch<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return ProductSchema.parse(res);
}

export async function deleteProduct(id: string): Promise<any> {
  return await apiFetch<any>(`/products/${id}`, {
    method: 'DELETE',
  });
}
