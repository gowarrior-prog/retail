import { apiFetch } from './client';

export async function syncOdoo(): Promise<any> {
  return await apiFetch<any>('/sync-odoo', { method: 'POST' });
}

export interface OdooConfigPayload {
  odoo_url?: string;
  odoo_db?: string;
  odoo_user?: string;
  odoo_pass?: string;
  wipe_old_data?: boolean;
}

export interface OdooConnectionTestResult {
  status: 'success' | 'error';
  connected: boolean;
  authenticated?: boolean;
  uid?: number;
  server_version?: string;
  message: string;
  suggested_url?: string | null;
  error_detail?: string;
}

export async function fetchOdooConfig(): Promise<{ url: string; db: string; user: string }> {
  try {
    return await apiFetch<{ url: string; db: string; user: string }>('/admin/odoo-config');
  } catch {
    return {
      url: 'http://192.168.100.2:8069',
      db: 'BilalClothHouse',
      user: 'bchnarowal@gmail.com',
    };
  }
}

export async function testOdooConnection(data?: OdooConfigPayload): Promise<OdooConnectionTestResult> {
  return await apiFetch<OdooConnectionTestResult>('/admin/test-odoo-connection', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export async function wipeAndSyncOdoo(params?: boolean | OdooConfigPayload): Promise<any> {
  if (typeof params === 'boolean') {
    return await apiFetch<any>(`/admin/wipe-and-sync-odoo?wipe_old_data=${params}`, {
      method: 'POST',
    });
  }
  const wipe = params?.wipe_old_data !== false;
  return await apiFetch<any>(`/admin/wipe-and-sync-odoo?wipe_old_data=${wipe}`, {
    method: 'POST',
    body: JSON.stringify(params || {}),
  });
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
