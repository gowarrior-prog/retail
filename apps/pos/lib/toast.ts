'use client';

import { playToastAudio } from './toastAudio';

export function showCatalogToast(message: string, type: 'add' | 'delete' | 'scan' = 'add') {
  playToastAudio(type);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('catalog-toast-event', {
        detail: { message, type },
      })
    );
  }
}
