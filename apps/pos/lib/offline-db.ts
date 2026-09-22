/**
 * Client-Side Cache Helper: DISABLED
 * Per user requirement, NO data is stored in browser IndexedDB or browser localStorage.
 * All data storage and offline management is handled server-side in SQLite (pos_local.db).
 */

export async function clearBrowserIndexedDB(): Promise<void> {
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      indexedDB.deleteDatabase('BilalPOS_OfflineDB');
    } catch {
      // Ignore cleanup error
    }
  }
}

/** Save to IndexedDB (DISABLED - No-Op) */
export async function setOfflineStore<T extends { id: string }>(
  _storeName: 'products' | 'employees' | 'khata' | 'purchases' | 'billing',
  _items: T[]
): Promise<void> {
  clearBrowserIndexedDB();
  return Promise.resolve();
}

/** Get from IndexedDB (DISABLED - Returns empty array) */
export async function getOfflineStore<T>(
  _storeName: 'products' | 'employees' | 'khata' | 'purchases' | 'billing'
): Promise<T[]> {
  return Promise.resolve([]);
}
