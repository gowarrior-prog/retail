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
  try {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
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
    console.warn(`[API] Failed to fetch ${path}:`, err.message || err);
    const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
    if (method === 'GET' && (path === '/products' || path === '/employees' || path === '/billing-history' || path === '/khata')) {
      return [] as unknown as T;
    }
    if (isNetworkError) {
      throw new Error(`Backend API server (${apiBase}) is offline or not running. Please start the FastAPI backend.`);
    }
    throw err;
  }
}

export type Product = z.infer<typeof ProductSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type BillingRecord = z.infer<typeof BillingRecordSchema>;

export async function fetchProducts(): Promise<Product[]> {
  const raw = await apiFetch<any[]>('/products');
  if (!Array.isArray(raw)) return [];
  return z.array(ProductSchema.partial()).parse(raw) as Product[];
}

export async function createProduct(data: any): Promise<Product> {
  const validated = ProductCreateSchema.parse(data);
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
  return apiFetch<any>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchEmployees(): Promise<Employee[]> {
  const raw = await apiFetch<any[]>('/employees');
  if (!Array.isArray(raw)) return [];
  return z.array(EmployeeSchema.partial()).parse(raw) as Employee[];
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
  return apiFetch<any>(`/employees/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchKhata(): Promise<any[]> {
  return apiFetch<any[]>('/khata');
}

export async function fetchPurchases(): Promise<any[]> {
  return apiFetch<any[]>('/purchases');
}

export async function fetchBillingHistory(): Promise<BillingRecord[]> {
  const raw = await apiFetch<any[]>('/billing-history');
  if (!Array.isArray(raw)) return [];
  return z.array(BillingRecordSchema.partial()).parse(raw) as BillingRecord[];
}

export async function posCheckout(data: any): Promise<any> {
  const validated = POSCheckoutSchema.parse(data);
  return apiFetch<any>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(validated),
  });
}

export async function syncOdoo(): Promise<any> {
  return apiFetch<any>('/sync-odoo', { method: 'POST' });
}

export async function syncOdooEmployees(): Promise<any> {
  return apiFetch<any>('/sync-odoo/employees', { method: 'POST' });
}

export async function syncOdooKhata(): Promise<any> {
  return apiFetch<any>('/sync-odoo/khata', { method: 'POST' });
}

export async function syncOdooPurchases(): Promise<any> {
  return apiFetch<any>('/sync-odoo/purchases', { method: 'POST' });
}

export async function fetchOfflineSummary(): Promise<any> {
  return apiFetch<any>('/offline-summary');
}

export async function triggerManualBackup(): Promise<any> {
  return apiFetch<any>('/backup-now', { method: 'POST' });
}

export async function fetchOdooSettings(): Promise<any> {
  const raw = await apiFetch<any>('/odoo-settings');
  return OdooSettingsSchema.partial().parse(raw);
}
