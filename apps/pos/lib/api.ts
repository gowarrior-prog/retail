const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'API Error');
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[API] Failed to fetch ${path}:`, err.message || err);
    if (path === '/products' || path === '/employees' || path === '/billing-history' || path === '/khata') {
      return [] as unknown as T;
    }
    throw err;
  }
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  profit_margin: number | null;
  category: string | null;
  image_url: string | null;
  stock: number | null;
  barcode: string | null;
  odoo_id: number | null;
  store_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  cnic?: string | null;
  role: string;
  base_salary: number;
  store_id?: string | null;
  is_deleted?: boolean;
  created_at?: string | null;
  shift?: 'Morning' | 'Evening' | 'Full Day';
  terminal?: string;
  status?: 'Clocked In' | 'On Break' | 'Off Duty';
  khata_balance?: number;
}

export interface BillingRecord {
  id: string;
  invoice_number: string;
  store_id?: string | null;
  customer_phone?: string | null;
  total_amount: number;
  discount: number;
  tax: number;
  payment_mode: string;
  cashier_name?: string | null;
  item_details_json: string;
  billing_date?: string | null;
}

export async function fetchProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return apiFetch<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchEmployees(): Promise<Employee[]> {
  return apiFetch<Employee[]>('/employees');
}

export async function fetchKhata(): Promise<any[]> {
  return apiFetch<any[]>('/khata');
}

export async function fetchBillingHistory(): Promise<BillingRecord[]> {
  return apiFetch<BillingRecord[]>('/billing-history');
}

export async function posCheckout(data: any): Promise<any> {
  return apiFetch<any>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function syncOdoo(): Promise<any> {
  return apiFetch<any>('/sync-odoo', { method: 'POST' });
}

