/**
 * Bilal Cloth POS - Anti-DOM Tampering & MutationObserver Security Engine
 * 
 * Prevents cashiers, users, or browser extensions from modifying:
 * - Product Prices
 * - Cart Totals
 * - Net Payable Amounts
 * - Cashier Profile & Store Identity
 * 
 * Mechanism:
 * 1. Global MutationObserver monitors DOM subtrees for unauthorized changes.
 * 2. Instant Reversion: Reverts modified innerText/textContent/attributes back to the authorized state.
 * 3. Enforces React Virtual DOM & Zustand Store as the single-source-of-truth.
 */

// Tracks authorized text content for protected DOM elements
const authorizedContentMap = new WeakMap<Node, string>();

let globalObserver: MutationObserver | null = null;
let isReverting = false;

/**
 * Registers an authorized text value for a protected node.
 */
export function registerAuthorizedContent(node: Node, content: string): void {
  authorizedContentMap.set(node, content);
}

/**
 * Checks whether an element is marked for anti-tamper protection.
 */
function isProtectedElement(el: Element | null): boolean {
  if (!el) return false;
  return (
    el.hasAttribute('data-tamper-protect') ||
    el.classList.contains('tamper-protected') ||
    el.closest('[data-tamper-protect="true"]') !== null
  );
}

/**
 * Initializes the global MutationObserver guard.
 */
export function initDomTamperProtection(onTamperDetected?: (details: { target: string; attemptedValue: string; originalValue: string }) => void): () => void {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {};
  }

  // Disconnect existing observer if any
  if (globalObserver) {
    globalObserver.disconnect();
  }

  globalObserver = new MutationObserver((mutations: MutationRecord[]) => {
    if (isReverting) return; // Prevent infinite mutation loops during rollback

    for (const mutation of mutations) {
      let targetElement: HTMLElement | null = null;

      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent && isProtectedElement(parent)) {
          targetElement = parent;
        }
      } else if (mutation.type === 'childList') {
        const target = mutation.target as HTMLElement;
        if (target && isProtectedElement(target)) {
          targetElement = target;
        }
      } else if (mutation.type === 'attributes') {
        const target = mutation.target as HTMLElement;
        if (target && isProtectedElement(target)) {
          targetElement = target;
        }
      }

      if (!targetElement) continue;

      // Check against recorded expected value
      const expectedAttr = targetElement.getAttribute('data-expected-val');
      const expectedText = expectedAttr !== null ? expectedAttr : authorizedContentMap.get(targetElement);

      if (expectedText !== undefined) {
        const currentText = targetElement.textContent || '';
        if (currentText.trim() !== expectedText.trim()) {
          // TAMPERING DETECTED!
          isReverting = true;
          try {
            // Instant Reversion: Restore pure verified text
            targetElement.textContent = expectedText;
            
            // Strip any contentEditable or malicious attributes added via DevTools
            if (targetElement.isContentEditable) {
              targetElement.removeAttribute('contenteditable');
            }

            console.warn(`[SECURITY ALERT] DOM Tampering blocked on <${targetElement.tagName.toLowerCase()}>. Reverted "${currentText}" -> "${expectedText}".`);

            if (onTamperDetected) {
              onTamperDetected({
                target: targetElement.getAttribute('data-tamper-type') || targetElement.tagName,
                attemptedValue: currentText,
                originalValue: expectedText,
              });
            }

            window.dispatchEvent(
              new CustomEvent('dom-tamper-blocked', {
                detail: {
                  target: targetElement.getAttribute('data-tamper-type') || 'Price/Total',
                  attemptedValue: currentText,
                  originalValue: expectedText,
                },
              })
            );
          } finally {
            isReverting = false;
          }
        }
      }
    }
  });

  // Start observing the entire body for characterData, childList, and attributes
  globalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'style', 'class'],
  });

  return () => {
    if (globalObserver) {
      globalObserver.disconnect();
      globalObserver = null;
    }
  };
}
