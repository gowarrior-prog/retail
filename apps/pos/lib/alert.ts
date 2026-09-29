'use client';

export function showProfessionalAlert(message: string, title: string = 'Attention Required', iconType?: 'return' | 'delete' | 'warning') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('professional-alert-event', {
        detail: { message, title, iconType },
      })
    );
  }
}
