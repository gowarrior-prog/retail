import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db3, SessionDb1, SessionDb3
from app.models.db1_catalog import OrderModel
from app.models.db3_finance import BillingHistoryModel, CustomerKhataModel, ShopPurchaseModel
from app.services.pos_service import POSCheckoutRequest, calculate_pos_receipt
from app.services.backup_service import load_local_backup_fallback
from app.services.odoo_service import sync_odoo_khata, sync_odoo_purchases

router = APIRouter(tags=["Billing, Khata & POS Analytics"])

@router.post("/sync-odoo/khata")
async def sync_khata_from_odoo():
    """Syncs ONLY Khata / Customer Receivables data from Odoo ERP into DB3 Finance."""
    res = await sync_odoo_khata()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.post("/sync-odoo/purchases")
async def sync_purchases_from_odoo():
    """Syncs ONLY Purchase Orders & Supplier Bills from Odoo ERP into DB3 Finance."""
    res = await sync_odoo_purchases()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.get("/khata")
async def get_khata_records(db: AsyncSession = Depends(get_db3)):
    try:
        result = await db.execute(select(CustomerKhataModel))
        return result.scalars().all()
    except Exception as e:
        print(f"Database error ({e}), reading khata from local hard drive JSON backup...")
        return load_local_backup_fallback("khata")

@router.get("/purchases")
async def get_shop_purchases(db: AsyncSession = Depends(get_db3)):
    try:
        result = await db.execute(select(ShopPurchaseModel))
        return result.scalars().all()
    except Exception as e:
        print(f"Database error ({e}), reading purchases from local hard drive JSON backup...")
        return load_local_backup_fallback("purchases")

@router.get("/billing-history")
async def get_billing_history(db: AsyncSession = Depends(get_db3)):
    try:
        result = await db.execute(select(BillingHistoryModel))
        rows = result.scalars().all()
        return [
            {
                "id": r.id,
                "invoice_number": r.invoice_number,
                "customer_phone": r.customer_phone,
                "total_amount": r.total_amount,
                "discount": r.discount,
                "tax": r.tax,
                "payment_mode": r.payment_mode,
                "cashier_name": r.cashier_name,
                "item_details_json": r.item_details_json,
                "billing_date": r.billing_date.isoformat() if r.billing_date else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        print(f"Database error ({e}), reading billing history from local hard drive JSON backup...")
        fallback = load_local_backup_fallback("billing")
        if fallback:
            return fallback
        raise HTTPException(status_code=500, detail=str(e))

from app.services.sqlite_sync_service import save_bill_locally, mark_bill_as_synced

@router.post("/pos/checkout")
async def pos_checkout(req: POSCheckoutRequest):
    calc = calculate_pos_receipt(req)
    inv_num = f"INV-{uuid.uuid4().hex[:8].upper()}"
    items_json_str = json.dumps([item.model_dump() for item in req.items])

    # 1. Save Bill Locally into SQLite FIRST for 100% data safety & offline availability
    local_bill = save_bill_locally(
        invoice_number=inv_num,
        customer_phone=req.customer_phone or "",
        total_amount=calc["grand_total"],
        discount=calc["discount_total"],
        tax=calc["tax_total"],
        payment_mode=req.payment_mode,
        cashier_name=req.cashier_name,
        item_details_json=items_json_str
    )

    # 2. Attempt remote database sync
    try:
        async with SessionDb3() as db3:
            billing_record = BillingHistoryModel(
                id=str(uuid.uuid4()),
                invoice_number=inv_num,
                customer_phone=req.customer_phone,
                total_amount=calc["grand_total"],
                discount=calc["discount_total"],
                tax=calc["tax_total"],
                payment_mode=req.payment_mode,
                cashier_name=req.cashier_name,
                item_details_json=items_json_str
            )
            db3.add(billing_record)

            async with SessionDb1() as db1:
                order_record = OrderModel(
                    id=str(uuid.uuid4()),
                    total_amount=calc["grand_total"],
                    type="POS_COUNTER",
                    status="COMPLETED",
                    items_json=items_json_str
                )
                db1.add(order_record)
                await db1.commit()

            if req.payment_mode.upper() == "CREDIT_KHATA" and calc["khata_added_balance"] > 0 and req.customer_phone:
                res = await db3.execute(select(CustomerKhataModel).filter(CustomerKhataModel.phone == req.customer_phone))
                khata = res.scalars().first()
                if khata:
                    khata.total_balance += calc["khata_added_balance"]
                else:
                    khata = CustomerKhataModel(
                        id=str(uuid.uuid4()),
                        customer_name=req.customer_name or "Retail Customer",
                        phone=req.customer_phone,
                        total_balance=calc["khata_added_balance"]
                    )
                    db3.add(khata)

            await db3.commit()
            
            # Mark bill as SYNCED in local SQLite DB upon successful remote database commit
            mark_bill_as_synced(local_bill["id"])
            local_bill["sync_status"] = "SYNCED"

    except Exception as db_err:
        print(f"Notice: Remote database sync pending ({db_err}). Bill is securely stored in local SQLite database.")

    calc["invoice_number"] = inv_num
    calc["status"] = "success"
    calc["local_bill"] = local_bill
    return calc
