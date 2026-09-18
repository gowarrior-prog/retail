/**
 * Client-Side IndexedDB Offline Engine
 * Provides persistent 100% offline storage for 8000+ products, employees,
 * khata records, and queued offline checkout bills using native IndexedDB.
 */

const DB_NAME = 'BilalPOS_OfflineDB';
const DB_VERSION = 1;

export interface StoredBill {
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
  synced?: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('employees')) {
        db.createObjectStore('employees', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('khata')) {
        db.createObjectStore('khata', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_bills')) {
        db.createObjectStore('offline_bills', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save an array of items to an IndexedDB store */
export async function setOfflineStore<T extends { id: string }>(
  storeName: 'products' | 'employees' | 'khata' | 'offline_bills',
  items: T[]
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Clear and re-populate store
    store.clear();
    for (const item of items) {
      if (item && item.id) {
        store.put(item);
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`[OfflineDB] Error writing to ${storeName}:`, err);
  }
}

/** Get all items from an IndexedDB store */
export async function getOfflineStore<T>(
  storeName: 'products' | 'employees' | 'khata' | 'offline_bills'
): Promise<T[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn(`[OfflineDB] Error reading from ${storeName}:`, err);
    return [];
  }
}

/** Save a single bill to offline bills queue */
export async function queueOfflineBill(bill: StoredBill): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('offline_bills', 'readwrite');
    const store = tx.objectStore('offline_bills');
    store.put(bill);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Error queuing offline bill:', err);
  }
}

/** Delete a bill from offline bills queue after successful sync */
export async function removeOfflineBill(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('offline_bills', 'readwrite');
    const store = tx.objectStore('offline_bills');
    store.delete(id);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineDB] Error removing offline bill:', err);
  }
}
