"""Printer router: Non-blocking ESC/POS thermal receipt printing and queue management."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.services.printer_service import get_printer_name
from app.services.print_queue_service import (
    enqueue_receipt_print,
    get_print_queue_status,
    retry_failed_job,
)

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
    """
    Non-blocking receipt printing:
    Instantly enqueues print task (< 2ms) and processes in isolated background worker.
    The POS billing screen never freezes even if the printer is offline or paper is out.
    """
    try:
        result = enqueue_receipt_print(req.model_dump(), req.printer_name)
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/queue")
async def get_queue_endpoint(limit: int = 25):
    """Returns status of recent and pending print jobs."""
    queue = get_print_queue_status(limit=limit)
    return {"status": "success", "total": len(queue), "jobs": queue}


@router.post("/retry/{job_id}")
async def retry_job_endpoint(job_id: str):
    """Retries a failed or offline print job."""
    return retry_failed_job(job_id)


@router.get("/list")
async def list_printers():
    """List all installed Windows printers safely."""
    try:
        import win32print
        printers = win32print.EnumPrinters(
            win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        )
        detected = get_printer_name()
        default_p = ""
        try:
            default_p = win32print.GetDefaultPrinter()
        except Exception:
            pass
        return {
            "printers": [
                {"name": name, "port": port}
                for _, port, name, _ in printers
            ],
            "detected_receipt_printer": detected,
            "default_printer": default_p
        }
    except Exception as e:
        return {
            "printers": [],
            "detected_receipt_printer": "Default",
            "default_printer": "Default",
            "notice": f"Printer enumerator: {str(e)}"
        }
