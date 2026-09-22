export * from './api/client';
export * from './api/products';
export * from './api/employees';
export * from './api/billing';
export * from './api/odoo';

// No-op dummy cache exports for backward compatibility without saving to browser
export function getLocalProductCache(): any[] { return []; }
export function saveLocalProductCache(_p: any[]): void {}
export function getLocalEmployeesCache(): any[] { return []; }
export function saveLocalEmployeesCache(_e: any[]): void {}
export function getLocalKhataCache(): any[] { return []; }
export function saveLocalKhataCache(_k: any[]): void {}
export function getLocalPurchasesCache(): any[] { return []; }
export function saveLocalPurchasesCache(_p: any[]): void {}
export function getLocalBillingCache(): any[] { return []; }
export function saveLocalBillingCache(_b: any[]): void {}
export function getLocalOfflineBills(): any[] { return []; }
export function saveLocalOfflineBills(_b: any[]): void {}
