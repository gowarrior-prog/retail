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

from app.services.sqlite_sync_service import save_bill_locally, mark_bill_as_synced, save_khata_locally, get_all_local_khata, get_pending_local_bills

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
    local_khata = get_all_local_khata()
    local_map = {}
    for lk in local_khata:
        local_map[lk["id"]] = {
            "id": lk["id"],
            "customer_name": lk["name"],
            "phone": lk.get("phone", ""),
            "total_balance": float(lk.get("balance") or 0.0),
            "updated_at": lk.get("updated_at"),
        }

    if db is not None:
        try:
            result = await db.execute(select(CustomerKhataModel))
            rows = result.scalars().all()
            if rows:
                for r in rows:
                    try:
                        save_khata_locally(
                            cust_id=r.id, odoo_id=None, name=r.customer_name or "",
                            phone=r.phone, email=None, balance=float(r.total_balance or 0)
                        )
                    except Exception:
                        pass
                    local_map[r.id] = {
                        "id": r.id,
                        "customer_name": r.customer_name,
                        "phone": r.phone,
                        "total_balance": float(r.total_balance or 0.0),
                    }
        except Exception as e:
            print(f"DB3 offline ({e}), loading khata from SQLite...")

    return list(local_map.values())


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

    if req.payment_mode.upper() == "CREDIT_KHATA" and calc["khata_added_balance"] > 0:
        try:
            save_khata_locally(
                cust_id=str(uuid.uuid4()), odoo_id=None,
                name=req.customer_name or "Retail Customer",
                phone=req.customer_phone or "", email=None,
                balance=calc["khata_added_balance"]
            )
        except Exception as khata_sq_err:
            print(f"SQLite khata save notice: {khata_sq_err}")

    # 2. Attempt remote database sync
    try:
        if db3 is not None:
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

            try:
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
            except Exception:
                pass

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


from app.services.backup_service import backup_all_data_to_hard_drive

@router.post("/pos/sync-pending")
async def sync_pending_offline_data():
    """
    Auto-Sync Engine: When network / internet connection is restored,
    syncs all pending local SQLite bills to remote cloud database and updates local hard drive backups.
    """
    pending = get_pending_local_bills()
    if not pending:
        return {"status": "success", "synced_count": 0, "message": "No pending offline bills to sync."}

    synced_count = 0
    for b in pending:
        try:
            async with SessionDb3() as db3:
                res = await db3.execute(select(BillingHistoryModel).filter(BillingHistoryModel.invoice_number == b["invoice_number"]))
                if not res.scalars().first():
                    billing_record = BillingHistoryModel(
                        id=b["id"],
                        invoice_number=b["invoice_number"],
                        customer_phone=b.get("customer_phone"),
                        total_amount=b["total_amount"],
                        discount=b.get("discount", 0.0),
                        tax=b.get("tax", 0.0),
                        payment_mode=b.get("payment_mode", "CASH"),
                        cashier_name=b.get("cashier_name", "Cashier"),
                        item_details_json=b["item_details_json"]
                    )
                    db3.add(billing_record)
                    await db3.commit()

            try:
                async with SessionDb1() as db1:
                    order_record = OrderModel(
                        id=str(uuid.uuid4()),
                        total_amount=b["total_amount"],
                        type="POS_COUNTER",
                        status="COMPLETED",
                        items_json=b["item_details_json"]
                    )
                    db1.add(order_record)
                    await db1.commit()
            except Exception as db1_err:
                print(f"Notice: DB1 order record sync exception: {db1_err}")

            mark_bill_as_synced(b["id"])
            synced_count += 1
        except Exception as e:
            print(f"Error syncing pending bill #{b.get('invoice_number')}: {e}")

    try:
        await backup_all_data_to_hard_drive()
    except Exception:
        pass

    return {
        "status": "success",
        "synced_count": synced_count,
        "message": f"Successfully synced {synced_count} pending offline bills to primary database!"
    }

