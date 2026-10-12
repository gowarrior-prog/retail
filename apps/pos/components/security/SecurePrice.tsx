'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface SecurePriceProps {
  amount: number | string;
  type?: 'price' | 'subtotal' | 'total' | 'net_payable' | 'cashier';
  className?: string;
  isRawString?: boolean;
}

/**
 * SecurePrice Component
 * Renders financial values locked with anti-tamper attributes.
 * Any attempt to modify text via browser DevTools or extensions
 * is instantly detected by MutationObserver and rolled back.
 */
export default function SecurePrice({
  amount,
  type = 'price',
  className = '',
  isRawString = false,
}: SecurePriceProps) {
  const displayVal = isRawString ? String(amount) : formatCurrency(Number(amount) || 0);

  return (
    <span
      data-tamper-protect="true"
      data-tamper-type={type}
      data-expected-val={displayVal}
      className={`tamper-protected select-none font-mono ${className}`}
      title="Tamper Protected Value"
    >
      {displayVal}
    </span>
  );
}
