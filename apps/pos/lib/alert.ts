'use client';

export function showProfessionalAlert(message: string, title: string = 'Attention Required') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('professional-alert-event', {
        detail: { message, title },
      })
    );
  }
}
