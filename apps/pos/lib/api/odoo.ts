import { apiFetch } from './client';

export async function fetchKhata(): Promise<any[]> {
  try {
    const raw = await apiFetch<any[]>('/khata');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function syncOdoo(): Promise<any> {
  return await apiFetch<any>('/sync-odoo', { method: 'POST' });
}

export async function syncOdooEmployees(): Promise<any> {
  return await apiFetch<any>('/sync-odoo/employees', { method: 'POST' });
}

export async function syncOdooKhata(): Promise<any> {
  return await apiFetch<any>('/sync-odoo/khata', { method: 'POST' });
}

export async function syncOdooPurchases(): Promise<any> {
  return await apiFetch<any>('/sync-odoo/purchases', { method: 'POST' });
}

export async function syncOdooBilling(): Promise<any> {
  return await apiFetch<any>('/sync-odoo/billing', { method: 'POST' });
}

export async function fetchOdooSettings(): Promise<any> {
  return await apiFetch<any>('/odoo-settings');
}

export async function triggerManualBackup(): Promise<any> {
  return await apiFetch<any>('/backup-now', { method: 'POST' });
}

export async function syncPendingOfflineData(): Promise<any> {
  return Promise.resolve({ success: true });
}

export async function fetchOfflineSummary(): Promise<any> {
  try {
    return await apiFetch<any>('/offline-summary');
  } catch {
    return null;
  }
}

export async function fetchSystemStatus(): Promise<any> {
  try {
    return await apiFetch<any>('/system-status');
  } catch {
    return null;
  }
}
