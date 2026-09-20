/**
 * Client-Side Cache Helper (Products, Employees, Khata)
 * Note: Bills are NOT stored in browser IndexedDB for maximum security.
 * All offline bills are handled server-side in SQLite (pos_local.db) with HMAC protection.
 */

const DB_NAME = 'BilalPOS_OfflineDB';
const DB_VERSION = 2;

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save an array of items to an IndexedDB store */
export async function setOfflineStore<T extends { id: string }>(
  storeName: 'products' | 'employees' | 'khata',
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
  storeName: 'products' | 'employees' | 'khata'
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
