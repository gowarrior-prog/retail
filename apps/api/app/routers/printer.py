"""Printer router: Direct ESC/POS thermal receipt printing."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.printer_service import print_receipt, get_printer_name
import win32print

router = APIRouter(prefix="/printer", tags=["Printer"])


class PrintReceiptRequest(BaseModel):
    invoice_number: str = "INV-0000"
    items: list = []
    subtotal: float = 0
    discount_total: float = 0
    grand_total: float = 0
    cash_paid: float = 0
    cash_change: float = 0
    payment_mode: str = "CASH"
    customer_name: str = ""
    cashier_name: str = "Admin"
    printer_name: Optional[str] = None


@router.post("/print-receipt")
async def api_print_receipt(req: PrintReceiptRequest):
    """Send receipt directly to Speed-X 80mm thermal printer with auto-cut."""
    try:
        result = print_receipt(req.model_dump(), req.printer_name)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/list")
async def list_printers():
    """List all installed Windows printers."""
    printers = win32print.EnumPrinters(
        win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
    )
    detected = get_printer_name()
    return {
        "printers": [
            {"name": name, "port": port}
            for _, port, name, _ in printers
        ],
        "detected_receipt_printer": detected,
        "default_printer": win32print.GetDefaultPrinter()
    }
