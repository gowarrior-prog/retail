import { z } from 'zod';
import { apiFetch } from './client';
import { POSCheckoutSchema, BillingRecordSchema } from '../validators';

export type BillingRecord = z.infer<typeof BillingRecordSchema>;

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

export async function posSalesReturn(data: {
  original_invoice_number: string;
  items: { product_id: string; product_name: string; quantity: number; refund_price: number }[];
  refund_amount: number;
  reason?: string;
  cashier_name?: string;
}): Promise<any> {
  return await apiFetch<any>('/pos/return', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createKhataCustomer(data: {
  customer_name: string;
  phone: string;
  initial_balance?: number;
}): Promise<any> {
  return await apiFetch<any>('/khata/add', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteKhataCustomer(id: string): Promise<any> {
  try {
    return await apiFetch<any>('/khata/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  } catch {
    return await apiFetch<any>(`/khata/${id}`, { method: 'DELETE' });
  }
}

export async function clearAllKhataRecords(): Promise<any> {
  return await apiFetch<any>('/khata/clear-all', {
    method: 'DELETE',
  });
}
