'use client';

/**
 * Plain-text receipt generator for Speed-X 80mm thermal printers
 * with "Generic / Text Only" Windows driver.
 * 
 * This driver strips all HTML/CSS formatting, so we use <pre> tags
 * with monospace plain text alignment using spaces/dashes.
 * 
 * Speed-X 80mm = ~42 characters per line at standard font.
 */

const LINE_WIDTH = 42;
const DASH_LINE = '-'.repeat(LINE_WIDTH);

function centerText(text: string): string {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function leftRight(left: string, right: string): string {
  const gap = Math.max(1, LINE_WIDTH - left.length - right.length);
  return left + ' '.repeat(gap) + right;
}

function formatAmt(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function threeColumns(col1: string, col2: string, col3: string): string {
  // ITEM(22)  QTY(6)  TOTAL(14)
  const c1 = col1.substring(0, 22).padEnd(22);
  const c2 = col2.substring(0, 6).padStart(3).padEnd(6);
  const c3 = col3.substring(0, 14).padStart(14);
  return c1 + c2 + c3;
}

export function generateThermalReceiptHtml(data: any): string {
  const r = data || {};
  const {
    invoice_number = `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    items = [],
    subtotal = 0,
    discount_total = 0,
    grand_total = 0,
    cash_paid = 0,
    cash_change = 0,
    payment_mode = 'CASH',
    customer_name = '',
    cashier_name = 'Admin'
  } = r;

  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const cust = customer_name || 'Walk-in Customer';

  // Build item rows
  const itemRows = items.map((it: any) => {
    const total = it.line_total || (it.price || it.unit_price || 0) * (it.quantity || 1);
    const name = (it.product_name || it.name || 'Item').substring(0, 22);
    const qty = String(it.quantity || 1);
    return threeColumns(name, qty, formatAmt(total));
  }).join('\n');

  // Build full receipt text
  const lines = [
    '',
    centerText('BILAL CLOTH & SILK CENTER'),
    centerText('Main Bazar Railway Road'),
    centerText('Narowal'),
    centerText('Ph: 0301-0606643'),
    DASH_LINE,
    leftRight('Inv #:', invoice_number),
    leftRight('Date:', `${dateStr} ${timeStr}`),
    leftRight('Cashier:', cashier_name),
    leftRight('Customer:', cust),
    DASH_LINE,
    threeColumns('ITEM', 'QTY', 'TOTAL'),
    DASH_LINE,
    itemRows,
    DASH_LINE,
    leftRight('Subtotal:', formatAmt(subtotal || grand_total)),
    ...(discount_total > 0 ? [leftRight('Discount:', `-${formatAmt(discount_total)}`)] : []),
    leftRight('Net Total:', formatAmt(grand_total)),
    leftRight('Payment Mode:', payment_mode),
    leftRight('Cash Paid:', formatAmt(cash_paid || grand_total)),
    leftRight('Change Due:', formatAmt(cash_change)),
    DASH_LINE,
    centerText('Thank you for shopping'),
    centerText('at Bilal Cloth!'),
    '',
    centerText('No refund without original'),
    centerText('invoice within 7 days.'),
    '',
  ].join('\n');

  const escFeed = '\x1B\x64\x04';
  const escCut = '\x1D\x56\x42\x00';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt</title>
<style>
@page { size: 80mm auto; margin: 0; }
* { margin: 0; padding: 0; }
body { margin: 0; padding: 2mm 1mm; }
pre { font-family: monospace; font-size: 12px; line-height: 1.4; white-space: pre; margin: 0; }
</style>
</head>
<body onload="setTimeout(function(){ window.print(); window.close(); }, 200);">
<pre>${lines}${escFeed}${escCut}</pre>
</body>
</html>`;
}
