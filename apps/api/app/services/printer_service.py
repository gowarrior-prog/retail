"""
Direct ESC/POS receipt printer service for Speed-X 80mm thermal printer.
Sends raw ESC/POS commands via win32print to the Windows printer.
This bypasses Chrome's print dialog and Generic/Text Only driver limitations.
"""
import win32print

LINE_WIDTH = 42
DASH_LINE = b'-' * LINE_WIDTH

# ESC/POS Command Constants
ESC_INIT        = b'\x1B\x40'           # Initialize printer
ESC_CENTER      = b'\x1B\x61\x01'       # Center alignment
ESC_LEFT        = b'\x1B\x61\x00'       # Left alignment
ESC_BOLD_ON     = b'\x1B\x45\x01'       # Bold ON
ESC_BOLD_OFF    = b'\x1B\x45\x00'       # Bold OFF
ESC_DOUBLE_ON   = b'\x1D\x21\x11'       # Double height+width
ESC_DOUBLE_OFF  = b'\x1D\x21\x00'       # Normal size
LF              = b'\x0A'               # Line feed


def _text(s: str) -> bytes:
    """Encode string to bytes for printer."""
    return s.encode('cp437', errors='replace')


def _center(s: str) -> bytes:
    pad = max(0, (LINE_WIDTH - len(s)) // 2)
    return _text(' ' * pad + s) + LF


def _left_right(left: str, right: str) -> bytes:
    gap = max(1, LINE_WIDTH - len(left) - len(right))
    return _text(left + ' ' * gap + right) + LF


def _three_col(c1: str, c2: str, c3: str) -> bytes:
    col1 = c1[:22].ljust(22)
    col2 = c2[:6].rjust(3).ljust(6)
    col3 = c3[:14].rjust(14)
    return _text(col1 + col2 + col3) + LF


def _fmt(amount) -> str:
    try:
        n = int(float(amount))
        return f"Rs. {n:,}"
    except (ValueError, TypeError):
        return "Rs. 0"


def build_receipt_bytes(data: dict) -> bytes:
    """Build complete ESC/POS receipt byte sequence."""
    inv = data.get('invoice_number', 'INV-0000')
    items = data.get('items', [])
    grand_total = data.get('grand_total', 0)
    subtotal = data.get('subtotal', grand_total)
    discount = data.get('discount_total', 0)
    cash_paid = data.get('cash_paid', grand_total)
    cash_change = data.get('cash_change', 0)
    mode = data.get('payment_mode', 'CASH')
    cashier = data.get('cashier_name', 'Admin')
    customer = data.get('customer_name', '') or 'Walk-in Customer'

    from datetime import datetime
    now = datetime.now()
    date_str = now.strftime('%d/%m/%Y %H:%M')

    buf = bytearray()
    buf += ESC_INIT

    # Top Margin (2 lines feed so header title BILAL CLOTH is never cut off at top)
    buf += LF + LF

    # Header
    buf += ESC_CENTER + ESC_BOLD_ON
    buf += _text('BILAL CLOTH & SILK CENTER') + LF
    buf += ESC_BOLD_OFF
    buf += _text('Main Bazar Railway Road') + LF
    buf += _text('Narowal') + LF
    buf += ESC_BOLD_ON + _text('Ph: 0301-0606643') + LF + ESC_BOLD_OFF
    buf += ESC_LEFT

    # Divider
    buf += DASH_LINE + LF

    # Meta
    buf += _left_right('Inv #:', inv)
    buf += _left_right('Date:', date_str)
    buf += _left_right('Cashier:', cashier)
    buf += _left_right('Customer:', customer)

    # Divider
    buf += DASH_LINE + LF

    # Table header
    buf += ESC_BOLD_ON
    buf += _three_col('ITEM', 'QTY', 'TOTAL')
    buf += ESC_BOLD_OFF
    buf += DASH_LINE + LF

    # Items
    for it in items:
        total = it.get('line_total') or (
            (it.get('price') or it.get('unit_price') or 0) *
            (it.get('quantity') or 1)
        )
        name = (it.get('product_name') or it.get('name') or 'Item')[:22]
        qty = str(it.get('quantity', 1))
        buf += _three_col(name, qty, _fmt(total))

    # Divider
    buf += DASH_LINE + LF

    # Totals
    buf += _left_right('Subtotal:', _fmt(subtotal or grand_total))

    if discount and float(discount) > 0:
        buf += _left_right('Discount:', f"-{_fmt(discount)}")

    # Net Total (Normal text size, exact same size as Subtotal)
    buf += ESC_BOLD_ON
    buf += _left_right('Net Total:', _fmt(grand_total))
    buf += ESC_BOLD_OFF

    buf += _left_right('Payment Mode:', mode)
    buf += _left_right('Cash Paid:', _fmt(cash_paid or grand_total))
    buf += ESC_BOLD_ON
    buf += _left_right('Change Due:', _fmt(cash_change))
    buf += ESC_BOLD_OFF

    # Divider
    buf += DASH_LINE + LF

    # Footer
    buf += ESC_CENTER
    buf += ESC_BOLD_ON
    buf += _text('Thank you for shopping') + LF
    buf += _text('at Bilal Cloth!') + LF
    buf += ESC_BOLD_OFF
    buf += LF
    buf += _text('No refund without original') + LF
    buf += _text('invoice within 7 days.') + LF
    buf += ESC_LEFT

    # Feed 4 lines to clear footer past cutter blade (~12mm)
    buf += b'\x1B\x64\x04'
    # SINGLE Partial Cut Command (GS V 66 0) for Speed-X 80mm
    buf += b'\x1D\x56\x42\x00'

    return bytes(buf)


def get_printer_name() -> str:
    """Find the Speed-X or Generic/Text Only printer name."""
    printers = win32print.EnumPrinters(
        win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
    )
    for _, _, name, _ in printers:
        lower = name.lower()
        if 'speed' in lower or '80mm' in lower or 'pos' in lower:
            return name
    # Fallback: look for Generic / Text Only
    for _, _, name, _ in printers:
        if 'generic' in name.lower() and 'text' in name.lower():
            return name
    # Last resort: default printer
    return win32print.GetDefaultPrinter()


def print_receipt(data: dict, printer_name: str = None) -> dict:
    """Send receipt directly to thermal printer via raw ESC/POS."""
    if not printer_name:
        printer_name = get_printer_name()

    raw_bytes = build_receipt_bytes(data)

    hprinter = win32print.OpenPrinter(printer_name)
    try:
        job_id = win32print.StartDocPrinter(hprinter, 1, (
            f"Receipt-{data.get('invoice_number', 'bill')}",
            None,
            "RAW"
        ))
        win32print.StartPagePrinter(hprinter)
        win32print.WritePrinter(hprinter, raw_bytes)
        win32print.EndPagePrinter(hprinter)
        win32print.EndDocPrinter(hprinter)
    finally:
        win32print.ClosePrinter(hprinter)

    return {
        "status": "success",
        "printer": printer_name,
        "job_id": job_id,
        "bytes_sent": len(raw_bytes)
    }
