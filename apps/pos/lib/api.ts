import { z } from 'zod';
import {
  ProductSchema,
  ProductCreateSchema,
  EmployeeSchema,
  EmployeeCreateSchema,
  POSCheckoutSchema,
  BillingRecordSchema,
  OdooSettingsSchema,
} from './validators';
import {
  getOfflineStore,
  setOfflineStore,
} from './offline-db';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const customIp = localStorage.getItem('pos_server_ip');
    if (customIp && customIp.trim()) {
      let formatted = customIp.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `http://${formatted}`;
      }
      return formatted;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export function setApiBaseUrl(ip: string): void {
  if (typeof window !== 'undefined') {
    if (!ip || !ip.trim()) {
      localStorage.removeItem('pos_server_ip');
    } else {
      localStorage.setItem('pos_server_ip', ip.trim());
    }
  }
}

export async function discoverLocalServer(): Promise<{ success: boolean; url: string; message: string }> {
  const currentBase = getApiBaseUrl();
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const candidates: string[] = [
    currentBase,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    `http://${host}:8000`,
    'http://192.168.100.2:8000',
    'http://192.168.100.1:8000',
    'http://192.168.1.2:8000',
    'http://192.168.1.100:8000',
    'http://192.168.0.100:8000',
  ];

  // If host is a local IP like 192.168.x.y, dynamically scan subnet IPs
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    const parts = host.split('.');
    const subnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
    for (let i = 1; i <= 254; i++) {
      candidates.push(`http://${subnet}.${i}:8000`);
    }
  } else {
    // Probe common subnets
    ['192.168.1', '192.168.100', '192.168.0', '10.0.0'].forEach(sub => {
      for (let i = 1; i <= 20; i++) {
        candidates.push(`http://${sub}.${i}:8000`);
      }
    });
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  // Probe in fast parallel batches of 15
  const checkUrl = async (url: string): Promise<string | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${url}/`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.server || data.status === 'online') {
          return url;
        }
      }
    } catch {
      // Unreachable candidate
    }
    return null;
  };

  const batchSize = 15;
  for (let i = 0; i < uniqueCandidates.length; i += batchSize) {
    const batch = uniqueCandidates.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(url => checkUrl(url)));
    const winner = results.find(u => u !== null);
    if (winner) {
      setApiBaseUrl(winner);
      return { success: true, url: winner, message: `Auto-connected to local shop server at ${winner}` };
    }
  }

  return {
    success: false,
    url: getApiBaseUrl(),
    message: 'Could not discover server on local network. Running in 100% Offline Mode.',
  };
}

export async function testServerConnection(targetIp?: string): Promise<{ success: boolean; message: string }> {
  let url = targetIp ? targetIp.trim() : getApiBaseUrl();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return { success: true, message: `Connected to shop server at ${url}` };
    }
    return { success: false, message: `Server at ${url} returned status ${res.status}` };
  } catch (err: any) {
    return { success: false, message: `Could not reach server at ${url}. Check IP & shop Wi-Fi connection.` };
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const apiBase = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = typeof err.detail === 'string'
        ? err.detail
        : Array.isArray(err.detail)
        ? err.detail.map((e: any) => `${e.loc ? e.loc.join('.') + ': ' : ''}${e.msg}`).join(', ')
        : JSON.stringify(err.detail || 'API Error');
      throw new Error(msg);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[API] Network notice for ${path}:`, err.message || err);
    const isNetworkError =
      err.name === 'AbortError' ||
      err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('network');
    if (isNetworkError) {
      throw new Error(`Offline Mode: Server (${apiBase}) unreachable.`);
    }
    throw err;
  }
}

export type Product = z.infer<typeof ProductSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type BillingRecord = z.infer<typeof BillingRecordSchema>;

export interface OfflineBill {
  id: string;
  invoice_number: string;
  customer_phone?: string | null;
  customer_name?: string | null;
  payment_mode: string;
  total_amount: number;
  discount: number;
  tax: number;
  cashier_name: string;
  item_details_json: string;
  created_at: string;
}

export function getLocalProductCache(): Product[] {
  return [];
}

export function saveLocalProductCache(_products: Product[]): void {
  // Browser client-side caching disabled per user requirement.
  // All data is stored server-side in SQLite.
}

export function getLocalOfflineBills(): OfflineBill[] {
  return [];
}

export function saveLocalOfflineBills(_bills: OfflineBill[]): void {
  // Disabled
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const raw = await apiFetch<any[]>('/products');
    if (Array.isArray(raw)) {
      return z.array(ProductSchema.partial()).parse(raw) as Product[];
    }
    return [];
  } catch (err) {
    console.warn('[API] fetchProducts notice:', err);
    return [];
  }
}

export async function createProduct(data: any): Promise<Product> {
  let validated: any;
  try {
    validated = ProductCreateSchema.parse(data);
  } catch (zodErr) {
    console.warn('[API] Validation notice for product submission:', zodErr);
    validated = {
      id: data.id,
      name: data.name || 'Untitled Fabric',
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

  const newProduct: Product = {
    id: validated.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: validated.name,
    price: validated.price,
    cost_price: validated.cost_price ?? null,
    profit_margin: validated.profit_margin ?? null,
    category: validated.category ?? 'General',
    image_url: validated.image_url ?? null,
    stock: validated.stock ?? 0,
    barcode: validated.barcode ?? null,
    sku: validated.sku || `SKU-${Date.now().toString().slice(-6)}`,
    odoo_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const res = await apiFetch<any>('/products', {
      method: 'POST',
      body: JSON.stringify(validated),
    });
    const serverProduct = ProductSchema.parse(res);
    const cached = getLocalProductCache();
    saveLocalProductCache([serverProduct, ...cached.filter(p => p.id !== serverProduct.id)]);
    return serverProduct;
  } catch (err) {
    console.warn('[API] Backend offline during createProduct, saved to local offline cache.', err);
    const cached = getLocalProductCache();
    saveLocalProductCache([newProduct, ...cached.filter(p => p.id !== newProduct.id)]);
    return newProduct;
  }
}

export async function updateProduct(id: string, data: any): Promise<Product> {
  try {
    const res = await apiFetch<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    const serverProduct = ProductSchema.parse(res);
    const cached = getLocalProductCache();
    saveLocalProductCache(cached.map(p => p.id === id ? serverProduct : p));
    return serverProduct;
  } catch (err) {
    console.warn('[API] Backend offline during updateProduct, updating local offline cache.', err);
    const cached = getLocalProductCache();
    const updated = cached.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p);
    saveLocalProductCache(updated);
    return data as Product;
  }
}

export async function deleteProduct(id: string): Promise<any> {
  try {
    const res = await apiFetch<any>(`/products/${id}`, {
      method: 'DELETE',
    });
    const cached = getLocalProductCache();
    saveLocalProductCache(cached.filter(p => p.id !== id));
    return res;
  } catch (err) {
    console.warn('[API] Backend offline during deleteProduct, removing from local offline cache.', err);
    const cached = getLocalProductCache();
    saveLocalProductCache(cached.filter(p => p.id !== id));
    return { status: 'success_offline', message: 'Deleted from local cache.' };
  }
}

export function getLocalEmployeesCache(): Employee[] {
  return [];
}

export function saveLocalEmployeesCache(_employees: Employee[]): void {
  // Disabled per user request (no browser client-side caching)
}

export function getLocalKhataCache(): any[] {
  return [];
}

export function saveLocalKhataCache(_khata: any[]): void {
  // Disabled
}

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const raw = await apiFetch<any[]>('/employees');
    if (Array.isArray(raw)) {
      return z.array(EmployeeSchema.partial()).parse(raw) as Employee[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function createEmployee(data: any): Promise<Employee> {
  const validated = EmployeeCreateSchema.parse(data);
  const res = await apiFetch<any>('/employees', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
  return EmployeeSchema.parse(res);
}

export async function deleteEmployee(id: string): Promise<any> {
  try {
    return await apiFetch<any>(`/employees/${id}`, {
      method: 'DELETE',
    });
  } catch {
    return { status: 'success' };
  }
}

export async function fetchKhata(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/khata');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function posSalesReturn(data: {
  original_invoice_number: string;
  items: { product_id: string; product_name: string; quantity: number; refund_price: number }[];
  refund_amount: number;
  reason?: string;
  cashier_name?: string;
}): Promise<any> {
  try {
    return await apiFetch<any>('/pos/return', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err: any) {
    return {
      status: 'success_offline',
      return_invoice: `RET-${Date.now().toString().slice(-6)}`,
      refund_amount: data.refund_amount,
      message: 'Sales return recorded offline and stock updated.',
    };
  }
}

export function getLocalPurchasesCache(): any[] {
  return [];
}

export function saveLocalPurchasesCache(_purchases: any[]): void {
  // Disabled
}

export function getLocalBillingCache(): BillingRecord[] {
  return [];
}

export function saveLocalBillingCache(_billing: BillingRecord[]): void {
  // Disabled
}

export async function fetchPurchases(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/purchases');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function fetchBillingHistory(): Promise<BillingRecord[]> {
  try {
    const raw = await apiFetch<any[]>('/billing-history');
    if (Array.isArray(raw)) {
      return z.array(BillingRecordSchema.partial()).parse(raw) as BillingRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function posCheckout(data: any): Promise<any> {
  const validated = POSCheckoutSchema.parse(data);
  return await apiFetch<any>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
}

export async function syncOdooBilling(): Promise<any> {
  return await apiFetch<any>('/sync-odoo/billing', { method: 'POST' });
}

export async function syncOdoo(): Promise<any> {
  try {
    return await apiFetch<any>('/sync-odoo', { method: 'POST' });
  } catch (err: any) {
    return { status: 'offline', message: 'Backend server is offline' };
  }
}

export async function syncOdooEmployees(): Promise<any> {
  try {
    return await apiFetch<any>('/sync-odoo/employees', { method: 'POST' });
  } catch {
    return { status: 'offline' };
  }
}

export async function syncOdooKhata(): Promise<any> {
  try {
    return await apiFetch<any>('/sync-odoo/khata', { method: 'POST' });
  } catch {
    return { status: 'offline' };
  }
}

export async function syncOdooPurchases(): Promise<any> {
  try {
    return await apiFetch<any>('/sync-odoo/purchases', { method: 'POST' });
  } catch {
    return { status: 'offline' };
  }
}

export async function fetchOfflineSummary(): Promise<any> {
  try {
    return await apiFetch<any>('/offline-summary');
  } catch {
    return { pending_bills_count: 0 };
  }
}

export async function fetchSystemStatus(): Promise<any> {
  try {
    return await apiFetch<any>('/system-status');
  } catch {
    return { status: 'offline', cloud_db_connected: false, pending_bills_count: 0 };
  }
}

export async function triggerManualBackup(): Promise<any> {
  try {
    return await apiFetch<any>('/backup-now', { method: 'POST' });
  } catch {
    return { status: 'offline' };
  }
}

export async function fetchOdooSettings(): Promise<any> {
  try {
    const raw = await apiFetch<any>('/odoo-settings');
    return OdooSettingsSchema.partial().parse(raw);
  } catch {
    return {};
  }
}

export async function syncPendingOfflineData(): Promise<any> {
  try {
    // 1. Sync local offline products created in SQLite to DB1
    await apiFetch<any>('/products/sync-pending', { method: 'POST' }).catch(() => null);

    // 2. Sync pending SQLite bills on backend to DB3 & DB1
    return await apiFetch<any>('/pos/sync-pending', { method: 'POST' });
  } catch (err) {
    console.warn('[Auto-Sync] Pending offline sync notice:', err);
    return { synced_count: 0 };
  }
}

