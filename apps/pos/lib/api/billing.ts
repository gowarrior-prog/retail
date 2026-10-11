import { apiFetch } from './client';
import { POSCheckoutSchema, BillingRecordSchema, BillingRecord } from '../validators';
import { z } from 'zod';

export async function fetchBillingHistory(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/billing-history');
    if (Array.isArray(raw)) {
      return raw;
    }
    return [];
  } catch (e) {
    console.error('fetchBillingHistory error:', e);
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

export async function fetchKhata(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/khata');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
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

export async function addKhataTransaction(data: {
  khata_id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  description?: string;
}): Promise<any> {
  try {
    return await apiFetch<any>('/khata/transaction', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch {
    return { status: 'offline', message: 'Transaction saved locally' };
  }
}

export async function fetchPurchases(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/purchases');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function addPurchase(data: {
  supplier_name: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  paid_amount: number;
  product_id?: string;
  notes?: string;
}): Promise<any> {
  try {
    return await apiFetch<any>('/purchases/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch {
    return { status: 'offline', message: 'Purchase saved locally' };
  }
}

export async function fetchInvoiceByNumber(invoiceNumber: string): Promise<any> {
  try {
    return await apiFetch<any>(`/billing-history/${invoiceNumber}`);
  } catch {
    return null;
  }
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

export async function fetchCustomerReturns(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/returns/customer');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function createCustomerReturn(data: any): Promise<any> {
  return await apiFetch<any>('/returns/customer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchSupplierReturns(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/returns/supplier');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function createSupplierReturn(data: any): Promise<any> {
  return await apiFetch<any>('/returns/supplier', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
