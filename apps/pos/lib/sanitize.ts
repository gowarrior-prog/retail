/**
 * Bilal Cloth POS - Security & Input Sanitization Engine
 * Protects frontend against Stored XSS, Reflected XSS, and DOM-based injection.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

/**
 * Escapes HTML characters for safe text insertion.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'`\/]/g, (char) => HTML_ENTITY_MAP[char] || char);
}

/**
 * Sanitizes general user text (product names, customer names, notes).
 * Strips script tags, iframes, HTML tags, and event handlers.
 */
export function sanitizeText(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return '';

  let sanitized = str.trim();

  // Strip script, iframe, style, object tags and their contents
  sanitized = sanitized.replace(/<(script|iframe|style|object|embed)[\s\S]*?<\/\1>/gi, '');

  // Strip self-closing or unclosed script tags
  sanitized = sanitized.replace(/<\/?(script|iframe|style|object|embed)[^>]*>/gi, '');

  // Strip inline javascript: and data: URIs
  sanitized = sanitized.replace(/(javascript|vbscript|data):/gi, '');

  // Strip inline HTML event handlers (onload, onerror, onclick, onmouseover, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, '');

  // Strip remaining HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, '');

  return sanitized;
}

/**
 * Sanitizes barcode and SKU inputs.
 * Allows strictly alphanumeric characters, hyphens, dots, underscores, and forward slashes.
 * Rejects any script tags or special characters.
 */
export function sanitizeBarcode(code: string | null | undefined): string {
  if (!code || typeof code !== 'string') return '';
  // Keep only uppercase/lowercase letters, digits, and safe delimiters: - _ . /
  return code.trim().replace(/[^a-zA-Z0-9\-_./]/g, '');
}

/**
 * Validates and sanitizes URLs against javascript: and malicious protocols.
 * Allows strictly http://, https://, or relative paths.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }

  // Must start with http://, https://, or a relative / path
  if (/^(https?:\/\/|\/)/i.test(trimmed)) {
    return trimmed;
  }

  return '';
}

/**
 * Sanitizes phone numbers.
 * Allows digits, plus, hyphens, and spaces only.
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.trim().replace(/[^\d+\- ]/g, '');
}
