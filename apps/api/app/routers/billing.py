import uuid
import json
import asyncio
import sqlite3
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db3, SessionDb1, SessionDb3
from app.models.db1_catalog import OrderModel
from app.models.db3_finance import BillingHistoryModel, CustomerKhataModel, ShopPurchaseModel, KhataTransactionModel
from app.services.pos_service import POSCheckoutRequest, calculate_pos_receipt
from app.services.backup_service import load_local_backup_fallback
from app.services.odoo_service import sync_odoo_khata, sync_odoo_purchases, sync_odoo_orders

from app.services.sqlite_sync_service import (
    save_bill_locally,
    mark_bill_as_synced,
    save_khata_locally,
    get_all_local_khata,
    delete_local_khata,
    clear_all_local_khata,
    get_pending_local_bills,
    get_all_local_bills,
    restock_local_product_stock,
    save_purchase_locally,
    get_all_local_purchases,
    delete_local_purchase,
    delete_local_customer_return,
    delete_local_supplier_return
)

from app.routers.catalog import invalidate_product_cache

router = APIRouter(tags=["Billing, Khata & POS Analytics"])

import time

_KHATA_CACHE = []
_KHATA_CACHE_TIME = 0.0

_PURCHASE_CACHE = []
_PURCHASE_CACHE_TIME = 0.0

_BILLING_CACHE = []
_BILLING_CACHE_TIME = 0.0

def invalidate_khata_cache():
    global _KHATA_CACHE, _KHATA_CACHE_TIME
    _KHATA_CACHE = []
    _KHATA_CACHE_TIME = 0.0

def invalidate_purchase_cache():
    global _PURCHASE_CACHE, _PURCHASE_CACHE_TIME
    _PURCHASE_CACHE = []
    _PURCHASE_CACHE_TIME = 0.0

def invalidate_billing_cache():
    global _BILLING_CACHE, _BILLING_CACHE_TIME
    _BILLING_CACHE = []
    _BILLING_CACHE_TIME = 0.0


@router.post("/sync-odoo/billing")
async def sync_billing_from_odoo():
    res = await sync_odoo_orders()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.post("/sync-odoo/khata")
async def sync_khata_from_odoo():
    res = await sync_odoo_khata()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.post("/sync-odoo/purchases")
async def sync_purchases_from_odoo():
    res = await sync_odoo_purchases()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.get("/khata")
async def get_khata_records(db: AsyncSession = Depends(get_db3)):
    global _KHATA_CACHE, _KHATA_CACHE_TIME
    import asyncio, time

    if _KHATA_CACHE and (time.time() - _KHATA_CACHE_TIME < 10.0):
        return _KHATA_CACHE

    local_khata = get_all_local_khata()
    if local_khata:
        mapped = [
            {
                "id": lk["id"],
                "customer_name": lk["name"],
                "phone": lk.get("phone", ""),
                "total_balance": float(lk.get("balance") or 0.0),
                "updated_at": lk.get("updated_at"),
            }
            for lk in local_khata
        ]
        _KHATA_CACHE = mapped
        _KHATA_CACHE_TIME = time.time()
        return mapped

    local_map = {}
    if db is not None:
        try:
            result = await asyncio.wait_for(db.execute(select(CustomerKhataModel)), timeout=0.8)
            rows = result.scalars().all()
            if rows:
                for r in rows:
                    save_khata_locally(
                        cust_id=r.id, odoo_id=None, name=r.customer_name or "",
                        phone=r.phone, email=None, balance=float(r.total_balance or 0)
                    )
                    local_map[r.id] = {
                        "id": r.id,
                        "customer_name": r.customer_name,
                        "phone": r.phone,
                        "total_balance": float(r.total_balance or 0.0),
                    }
        except Exception:
            pass

    _KHATA_CACHE = list(local_map.values())
    _KHATA_CACHE_TIME = time.time()
    return _KHATA_CACHE


class AddKhataRequest(BaseModel):
    customer_name: str
    phone: str
    initial_balance: float = 0.0

@router.post("/khata/add")
async def add_khata_customer(req: AddKhataRequest, db: AsyncSession = Depends(get_db3)):
    cust_id = str(uuid.uuid4())
    save_khata_locally(
        cust_id=cust_id, odoo_id=None,
        name=req.customer_name, phone=req.phone,
        email=None, balance=req.initial_balance
    )
    try:
        if db is not None:
            khata = CustomerKhataModel(
                id=cust_id, customer_name=req.customer_name,
                phone=req.phone, total_balance=req.initial_balance
            )
            db.add(khata)
            await db.commit()
    except Exception as err:
        print(f"Notice: Khata cloud save notice: {err}")

    return {
        "status": "success",
        "id": cust_id,
        "customer_name": req.customer_name,
        "phone": req.phone,
        "total_balance": req.initial_balance,
        "message": "New Khata customer added successfully!"
    }


@router.delete("/khata/clear-all")
async def clear_all_khata_records(db: AsyncSession = Depends(get_db3)):
    clear_all_local_khata()
    try:
        if db is not None:
            await db.execute(CustomerKhataModel.__table__.delete())
            await db.commit()
    except Exception as e:
        print(f"Notice: DB3 clear exception: {e}")
    return {"status": "success", "message": "All Khata records permanently deleted."}


@router.delete("/khata/{cust_id}")
async def delete_khata_record(cust_id: str, db: AsyncSession = Depends(get_db3)):
    delete_local_khata(cust_id)
    if db is not None:
        try:
            res = await db.execute(select(CustomerKhataModel).filter(CustomerKhataModel.id == cust_id))
            rec = res.scalars().first()
            if rec:
                await db.delete(rec)
                await db.commit()
        except Exception as e:
            print(f"Notice: DB3 delete exception: {e}")
    invalidate_khata_cache()
    return {"status": "success", "id": cust_id, "message": "Khata record deleted successfully."}


class DeleteKhataRequest(BaseModel):
    id: str

@router.post("/khata/delete")
async def delete_khata_record_post(req: DeleteKhataRequest, db: AsyncSession = Depends(get_db3)):
    return await delete_khata_record(req.id, db)


class KhataTransactionRequest(BaseModel):
    khata_id: str
    type: str  # DEBIT, CREDIT
    amount: float
    description: Optional[str] = "Transaction"

@router.post("/khata/transaction")
async def add_khata_transaction(req: KhataTransactionRequest, db: AsyncSession = Depends(get_db3)):
    tx_id = str(uuid.uuid4())
    balance_change = req.amount if req.type.upper() == "DEBIT" else -req.amount

    # 1. ALWAYS update local SQLite khata balance
    local_khata_list = get_all_local_khata()
    target_local = next((k for k in local_khata_list if k["id"] == req.khata_id), None)
    new_bal = 0.0
    if target_local:
        new_bal = max(0.0, float(target_local.get("balance") or 0.0) + balance_change)
        save_khata_locally(
            cust_id=req.khata_id, odoo_id=target_local.get("odoo_id"),
            name=target_local["name"], phone=target_local.get("phone"),
            email=target_local.get("email"), balance=new_bal
        )

    # 2. Attempt remote DB3 commit
    if db is not None:
        try:
            res = await db.execute(select(CustomerKhataModel).filter(CustomerKhataModel.id == req.khata_id))
            khata = res.scalars().first()
            if khata:
                khata.total_balance = max(0.0, float(khata.total_balance or 0.0) + balance_change)
                tx = KhataTransactionModel(
                    id=tx_id,
                    khata_id=req.khata_id,
                    type=req.type.upper(),
                    amount=req.amount,
                    description=req.description
                )
                db.add(tx)
                await db.commit()
                new_bal = khata.total_balance
        except Exception as err:
            try:
                await db.rollback()
            except Exception:
                pass
            print(f"Notice: Remote Khata transaction notice: {err}")

    invalidate_khata_cache()

    return {
        "status": "success",
        "transaction_id": tx_id,
        "new_balance": new_bal,
        "message": f"Khata transaction ({req.type}) recorded successfully!"
    }


class AddPurchaseRequest(BaseModel):
    supplier_name: str
    item_name: str
    quantity: int
    total_cost: float
    paid_amount: float
    product_id: Optional[str] = None
    notes: Optional[str] = None

@router.post("/purchases/add")
async def add_shop_purchase(req: AddPurchaseRequest, db: AsyncSession = Depends(get_db3)):
    pur_id = str(uuid.uuid4())
    remaining = max(0.0, req.total_cost - req.paid_amount)

    # 1. ALWAYS save Purchase locally in SQLite
    save_purchase_locally(
        pur_id=pur_id,
        supplier_name=req.supplier_name,
        item_name=req.item_name,
        quantity=req.quantity,
        total_cost=req.total_cost,
        paid_amount=req.paid_amount,
        remaining=remaining,
        notes=req.notes
    )

    # 2. Auto-restock product in SQLite local DB if product_id is specified
    if req.product_id:
        try:
            restock_local_product_stock(req.product_id, req.quantity)
        except Exception as sq_err:
            print(f"Notice: SQLite purchase restocking notice: {sq_err}")

    # 3. Attempt DB3 Finance commit
    if db is not None:
        try:
            pur = ShopPurchaseModel(
                id=pur_id,
                supplier_name=req.supplier_name,
                item_name=req.item_name,
                quantity=req.quantity,
                total_cost=req.total_cost,
                paid_amount=req.paid_amount,
                remaining=remaining,
                notes=req.notes
            )
            db.add(pur)
            await db.commit()
        except Exception as db_err:
            print(f"Notice: Purchase DB3 save notice: {db_err}")

    # 4. Invalidate RAM caches for 0ms instant sync
    invalidate_purchase_cache()
    if req.product_id:
        invalidate_product_cache()

    return {
        "status": "success",
        "id": pur_id,
        "remaining": remaining,
        "message": "Supplier purchase bill recorded and stock intake completed successfully!"
    }


@router.get("/purchases")
async def get_shop_purchases(db: AsyncSession = Depends(get_db3)):
    global _PURCHASE_CACHE, _PURCHASE_CACHE_TIME
    import asyncio, time

    if _PURCHASE_CACHE and (time.time() - _PURCHASE_CACHE_TIME < 10.0):
        return _PURCHASE_CACHE

    local_purchases = get_all_local_purchases()
    if local_purchases:
        _PURCHASE_CACHE = local_purchases
        _PURCHASE_CACHE_TIME = time.time()
        return local_purchases

    if db is not None:
        try:
            result = await asyncio.wait_for(db.execute(select(ShopPurchaseModel)), timeout=0.8)
            rows = result.scalars().all()
            if rows:
                db_mapped = [
                    {
                        "id": r.id,
                        "supplier_name": r.supplier_name,
                        "item_name": r.item_name,
                        "quantity": r.quantity,
                        "total_cost": r.total_cost,
                        "paid_amount": r.paid_amount,
                        "remaining": r.remaining,
                        "notes": r.notes,
                        "purchase_date": r.purchase_date.isoformat() if r.purchase_date else None,
                    }
                    for r in rows
                ]
                _PURCHASE_CACHE = db_mapped
                _PURCHASE_CACHE_TIME = time.time()
                return db_mapped
        except Exception:
            pass
    return []


class DeletePurchaseRequest(BaseModel):
    id: str

@router.delete("/purchases/{pur_id}")
async def delete_shop_purchase(pur_id: str, db: AsyncSession = Depends(get_db3)):
    pur_str = str(pur_id).strip()
    delete_local_purchase(pur_str)
    if db is not None:
        try:
            from sqlalchemy import func
            res = await db.execute(
                select(ShopPurchaseModel).filter(
                    (ShopPurchaseModel.id == pur_str) | (func.lower(ShopPurchaseModel.supplier_name) == pur_str.lower())
                )
            )
            recs = res.scalars().all()
            for r in recs:
                await db.delete(r)
            if recs:
                await db.commit()
        except Exception as e:
            try:
                await db.rollback()
            except Exception:
                pass
            print(f"Notice: DB3 purchase delete notice: {e}")
    invalidate_purchase_cache()
    return {"status": "success", "id": pur_str, "message": "Purchase record deleted successfully"}

@router.post("/purchases/delete")
async def delete_shop_purchase_post(req: DeletePurchaseRequest, db: AsyncSession = Depends(get_db3)):
    return await delete_shop_purchase(req.id, db)


class UpdateSupplierNameRequest(BaseModel):
    old_name: str
    new_name: str

@router.put("/purchases/supplier")
async def update_supplier_name_endpoint(req: UpdateSupplierNameRequest, db: AsyncSession = Depends(get_db3)):
    old_clean = req.old_name.strip()
    new_clean = req.new_name.strip()
    if not new_clean:
        raise HTTPException(status_code=400, detail="New supplier name cannot be empty")
    
    # 1. Update in local SQLite
    from app.services.sqlite_sync_service import get_sqlite_conn
    conn = get_sqlite_conn()
    c = conn.cursor()
    c.execute("UPDATE local_purchases SET supplier_name = ? WHERE LOWER(supplier_name) = LOWER(?)", (new_clean, old_clean))
    conn.commit()
    conn.close()

    # 2. Update in DB3
    if db is not None:
        try:
            from sqlalchemy import func
            res = await db.execute(select(ShopPurchaseModel).filter(func.lower(ShopPurchaseModel.supplier_name) == old_clean.lower()))
            rows = res.scalars().all()
            for r in rows:
                r.supplier_name = new_clean
            if rows:
                await db.commit()
        except Exception:
            pass
            
    invalidate_purchase_cache()
    return {"status": "success", "old_name": old_clean, "new_name": new_clean, "message": f"Supplier '{old_clean}' updated to '{new_clean}' successfully!"}



@router.get("/billing-history/{invoice_number}")
async def get_invoice_by_number(invoice_number: str, db: AsyncSession = Depends(get_db3)):
    if db is not None:
        try:
            res = await db.execute(select(BillingHistoryModel).filter(BillingHistoryModel.invoice_number == invoice_number))
            inv = res.scalars().first()
            if inv:
                return {
                    "status": "success",
                    "id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "customer_phone": inv.customer_phone,
                    "total_amount": inv.total_amount,
                    "discount": inv.discount,
                    "tax": inv.tax,
                    "payment_mode": inv.payment_mode,
                    "cashier_name": inv.cashier_name,
                    "item_details_json": inv.item_details_json,
                    "billing_date": inv.billing_date.isoformat() if inv.billing_date else None,
                }
        except Exception as e:
            print(f"Notice: Invoice fetch exception: {e}")

    # Fallback to local SQLite pending bills inspection
    from app.services.sqlite_sync_service import get_sqlite_conn
    try:
        conn = get_sqlite_conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        row = c.execute("SELECT * FROM local_bills WHERE invoice_number = ?", (invoice_number,)).fetchone()
        conn.close()
        if row:
            r = dict(row)
            return {
                "status": "success",
                "id": r["id"],
                "invoice_number": r["invoice_number"],
                "customer_phone": r["customer_phone"],
                "total_amount": r["total_amount"],
                "discount": r["discount"],
                "tax": r["tax"],
                "payment_mode": r["payment_mode"],
                "cashier_name": r["cashier_name"],
                "item_details_json": r["item_details_json"],
                "billing_date": r["created_at"],
            }
    except Exception:
        pass

    raise HTTPException(status_code=404, detail=f"Invoice #{invoice_number} not found.")


@router.get("/billing-history")
async def get_billing_history(db: AsyncSession = Depends(get_db3)):
    global _BILLING_CACHE, _BILLING_CACHE_TIME
    import asyncio, time

    if _BILLING_CACHE and (time.time() - _BILLING_CACHE_TIME < 10.0):
        return _BILLING_CACHE

    local_bills = get_all_local_bills()
    if local_bills:
        mapped_local = [
            {
                "id": b["id"],
                "invoice_number": b["invoice_number"],
                "customer_phone": b.get("customer_phone"),
                "total_amount": b["total_amount"],
                "discount": b.get("discount", 0.0),
                "tax": b.get("tax", 0.0),
                "payment_mode": b.get("payment_mode", "CASH"),
                "cashier_name": b.get("cashier_name", "Cashier"),
                "item_details_json": b["item_details_json"],
                "billing_date": b.get("created_at"),
                "created_at": b.get("created_at"),
            }
            for b in local_bills
        ]
        _BILLING_CACHE = mapped_local
        _BILLING_CACHE_TIME = time.time()
        return mapped_local

    if db is not None:
        try:
            result = await asyncio.wait_for(db.execute(select(BillingHistoryModel)), timeout=0.8)
            rows = result.scalars().all()
            if rows:
                db_mapped = [
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
                _BILLING_CACHE = db_mapped
                _BILLING_CACHE_TIME = time.time()
                return db_mapped
        except Exception:
            pass
    return []


@router.post("/pos/checkout")
async def pos_checkout(req: POSCheckoutRequest):
    calc = calculate_pos_receipt(req)
    inv_num = f"INV-{uuid.uuid4().hex[:8].upper()}"
    items_json_str = json.dumps([item.model_dump() for item in req.items])

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

    # Deduct sold items from local SQLite stock & clear RAM cache
    for item in req.items:
        try:
            restock_local_product_stock(item.product_id, -item.quantity)
        except Exception as stk_err:
            print(f"Notice: Stock deduction error for {item.product_name}: {stk_err}")

    invalidate_product_cache()

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

    # Audit discount override if cashier applied discounts
    if calc.get("discount_total", 0) > 0:
        try:
            from app.services.sqlite_sync_service import log_system_audit_event
            log_system_audit_event(
                user_id=req.cashier_name or "cashier",
                user_name=req.cashier_name or "Cashier",
                event_type="discount_override",
                action="POS_DISCOUNT_APPLIED",
                target_type="INVOICE",
                target_id=inv_num,
                details={"discount_amount": calc["discount_total"], "grand_total": calc["grand_total"], "invoice": inv_num}
            )
        except Exception:
            pass

    # Offload cloud DB sync to background task so checkout returns in < 2ms!
    asyncio.create_task(_bg_sync_bill_to_cloud(req, inv_num, calc, items_json_str, local_bill["id"]))

    calc["invoice_number"] = inv_num
    calc["status"] = "success"
    calc["local_bill"] = local_bill
    return calc


async def _bg_sync_bill_to_cloud(req, inv_num, calc, items_json_str, local_bill_id):
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
            mark_bill_as_synced(local_bill_id)
    except Exception as db_err:
        print(f"Notice: Background cloud sync notice: {db_err}")


class SalesReturnItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    refund_price: float

class SalesReturnRequest(BaseModel):
    original_invoice_number: str
    items: List[SalesReturnItem]
    refund_amount: float
    reason: str = "Customer Return"
    cashier_name: str = "Admin"

@router.post("/pos/return")
async def pos_return_product(req: SalesReturnRequest):
    ret_num = f"RET-{uuid.uuid4().hex[:6].upper()}"
    items_dict = [i.model_dump() for i in req.items]
    items_json_str = json.dumps(items_dict)

    for itm in req.items:
        try:
            restock_local_product_stock(itm.product_id, itm.quantity)
        except Exception as e:
            print(f"Notice: SQLite restocking error: {e}")

    invalidate_product_cache()

    local_return_bill = save_bill_locally(
        invoice_number=ret_num,
        customer_phone=f"REFUND-{req.original_invoice_number}",
        total_amount=-abs(req.refund_amount),
        discount=0.0,
        tax=0.0,
        payment_mode=f"REFUND ({req.reason})",
        cashier_name=req.cashier_name,
        item_details_json=items_json_str
    )

    try:
        async with SessionDb3() as db3:
            return_record = BillingHistoryModel(
                id=str(uuid.uuid4()),
                invoice_number=ret_num,
                customer_phone=f"REFUND-{req.original_invoice_number}",
                total_amount=-abs(req.refund_amount),
                discount=0.0,
                tax=0.0,
                payment_mode=f"REFUND ({req.reason})",
                cashier_name=req.cashier_name,
                item_details_json=items_json_str
            )
            db3.add(return_record)
            await db3.commit()
            mark_bill_as_synced(local_return_bill["id"])
    except Exception as db_err:
        print(f"Notice: Return recorded offline ({db_err}).")

    return {
        "status": "success",
        "return_invoice": ret_num,
        "original_invoice_number": req.original_invoice_number,
        "refund_amount": req.refund_amount,
        "message": "Sales return processed successfully and inventory restocked."
    }


class CustomerReturnCreateRequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    original_invoice: Optional[str] = None
    items: List[SalesReturnItem]
    total_value: float
    refund_type: str = "CASH"
    condition: str = "Restocked"
    status: str = "Completed"

class SupplierReturnCreateRequest(BaseModel):
    supplier_name: str
    purchase_bill: Optional[str] = None
    items: List[SalesReturnItem]
    total_value: float
    reason: Optional[str] = "Defective Fabric Intake"
    status: str = "Completed"


@router.post("/returns/customer")
async def create_customer_return(req: CustomerReturnCreateRequest):
    from app.services.sqlite_sync_service import save_customer_return_locally
    from app.core.database import SessionDb2
    from app.models.db2_operations import CustomerReturnModel

    ret_id = str(uuid.uuid4())
    ret_code = f"RET-{uuid.uuid4().hex[:6].upper()}"
    items_json = json.dumps([i.model_dump() for i in req.items])

    save_customer_return_locally(
        ret_id=ret_id,
        return_code=ret_code,
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        original_invoice=req.original_invoice,
        items_json=items_json,
        total_value=req.total_value,
        refund_type=req.refund_type,
        condition=req.condition,
        status=req.status
    )

    try:
        from app.services.sqlite_sync_service import log_system_audit_event
        log_system_audit_event(
            user_id="cashier",
            user_name="Cashier",
            event_type="void_return",
            action="CUSTOMER_RETURN_PROCESSED",
            target_type="RETURN",
            target_id=ret_code,
            details={"original_invoice": req.original_invoice, "total_value": req.total_value, "refund_type": req.refund_type, "return_code": ret_code}
        )
    except Exception:
        pass

    if req.condition == "Restocked":
        for item in req.items:
            try:
                restock_local_product_stock(item.product_id, item.quantity)
            except Exception as stk_err:
                print(f"Notice: Return restocking notice: {stk_err}")

    invalidate_product_cache()

    try:
        async with SessionDb2() as db2:
            ret_obj = CustomerReturnModel(
                id=ret_id,
                return_code=ret_code,
                customer_name=req.customer_name,
                customer_phone=req.customer_phone,
                original_invoice=req.original_invoice,
                items_json=items_json,
                total_value=req.total_value,
                refund_type=req.refund_type,
                condition=req.condition,
                status=req.status
            )
            db2.add(ret_obj)
            await db2.commit()
    except Exception as db_err:
        print(f"Notice: DB2 Customer Return save notice: {db_err}")

    return {
        "status": "success",
        "id": ret_id,
        "return_code": ret_code,
        "message": "Customer Return saved to DB2 and SQLite successfully!"
    }


@router.get("/returns/customer")
async def get_customer_returns():
    from app.services.sqlite_sync_service import get_all_local_customer_returns
    local_rets = get_all_local_customer_returns()
    if local_rets:
        return local_rets

    try:
        from app.core.database import SessionDb2
        from app.models.db2_operations import CustomerReturnModel
        async with SessionDb2() as db2:
            res = await db2.execute(select(CustomerReturnModel).order_by(CustomerReturnModel.created_at.desc()))
            rows = res.scalars().all()
            return [
                {
                    "id": r.id,
                    "return_code": r.return_code,
                    "customer_name": r.customer_name,
                    "customer_phone": r.customer_phone,
                    "original_invoice": r.original_invoice,
                    "items_json": r.items_json,
                    "total_value": r.total_value,
                    "refund_type": r.refund_type,
                    "condition": r.condition,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
    except Exception:
        return []


class DeleteReturnRequest(BaseModel):
    id: str

@router.delete("/returns/customer/{ret_id}")
async def delete_customer_return_endpoint(ret_id: str):
    delete_local_customer_return(ret_id)
    try:
        from app.core.database import SessionDb2
        from app.models.db2_operations import CustomerReturnModel
        async with SessionDb2() as db2:
            res = await db2.execute(
                select(CustomerReturnModel).filter(
                    (CustomerReturnModel.id == ret_id) | (CustomerReturnModel.return_code == ret_id)
                )
            )
            recs = res.scalars().all()
            for r in recs:
                await db2.delete(r)
            if recs:
                await db2.commit()
    except Exception as e:
        print(f"Notice: DB2 customer return delete notice: {e}")
    return {"status": "success", "id": ret_id, "message": "Customer return record deleted successfully"}

@router.post("/returns/customer/delete")
async def delete_customer_return_post(req: DeleteReturnRequest):
    return await delete_customer_return_endpoint(req.id)


@router.post("/returns/supplier")
async def create_supplier_return(req: SupplierReturnCreateRequest):
    from app.services.sqlite_sync_service import save_supplier_return_locally
    from app.core.database import SessionDb2
    from app.models.db2_operations import SupplierReturnModel

    ret_id = str(uuid.uuid4())
    ret_code = f"SRET-{uuid.uuid4().hex[:6].upper()}"
    items_json = json.dumps([i.model_dump() for i in req.items])

    save_supplier_return_locally(
        ret_id=ret_id,
        return_code=ret_code,
        supplier_name=req.supplier_name,
        purchase_bill=req.purchase_bill,
        items_json=items_json,
        total_value=req.total_value,
        reason=req.reason,
        status=req.status
    )

    for item in req.items:
        try:
            restock_local_product_stock(item.product_id, -item.quantity)
        except Exception as stk_err:
            print(f"Notice: Supplier return stock deduction notice: {stk_err}")

    invalidate_product_cache()

    try:
        async with SessionDb2() as db2:
            ret_obj = SupplierReturnModel(
                id=ret_id,
                return_code=ret_code,
                supplier_name=req.supplier_name,
                purchase_bill=req.purchase_bill,
                items_json=items_json,
                total_value=req.total_value,
                reason=req.reason,
                status=req.status
            )
            db2.add(ret_obj)
            await db2.commit()
    except Exception as db_err:
        print(f"Notice: DB2 Supplier Return save notice: {db_err}")

    return {
        "status": "success",
        "id": ret_id,
        "return_code": ret_code,
        "message": "Supplier Return saved to DB2 and SQLite successfully!"
    }


@router.get("/returns/supplier")
async def get_supplier_returns():
    from app.services.sqlite_sync_service import get_all_local_supplier_returns
    local_rets = get_all_local_supplier_returns()
    if local_rets:
        return local_rets

    try:
        from app.core.database import SessionDb2
        from app.models.db2_operations import SupplierReturnModel
        async with SessionDb2() as db2:
            res = await db2.execute(select(SupplierReturnModel).order_by(SupplierReturnModel.created_at.desc()))
            rows = res.scalars().all()
            return [
                {
                    "id": r.id,
                    "return_code": r.return_code,
                    "supplier_name": r.supplier_name,
                    "purchase_bill": r.purchase_bill,
                    "items_json": r.items_json,
                    "total_value": r.total_value,
                    "reason": r.reason,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
    except Exception:
        return []


@router.delete("/returns/supplier/{ret_id}")
async def delete_supplier_return_endpoint(ret_id: str):
    delete_local_supplier_return(ret_id)
    try:
        from app.core.database import SessionDb2
        from app.models.db2_operations import SupplierReturnModel
        async with SessionDb2() as db2:
            res = await db2.execute(
                select(SupplierReturnModel).filter(
                    (SupplierReturnModel.id == ret_id) | (SupplierReturnModel.return_code == ret_id)
                )
            )
            recs = res.scalars().all()
            for r in recs:
                await db2.delete(r)
            if recs:
                await db2.commit()
    except Exception as e:
        print(f"Notice: DB2 supplier return delete notice: {e}")
    return {"status": "success", "id": ret_id, "message": "Supplier return record deleted successfully"}

@router.post("/returns/supplier/delete")
async def delete_supplier_return_post(req: DeleteReturnRequest):
    return await delete_supplier_return_endpoint(req.id)



from app.services.backup_service import backup_all_data_to_hard_drive
from app.services.sqlite_sync_service import (
    get_pending_local_bills,
    get_all_local_purchases,
    get_all_local_customer_returns,
    get_all_local_supplier_returns
)

@router.post("/pos/sync-pending")
async def sync_pending_offline_data():
    synced_bills = 0
    synced_purchases = 0
    synced_cust_rets = 0
    synced_supp_rets = 0

    # 1. Sync Pending Bills
    pending = get_pending_local_bills()
    if pending:
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
                    pass

                mark_bill_as_synced(b["id"])
                synced_bills += 1
            except Exception as e:
                pass

    # 2. Sync Local Purchases to Cloud DB3
    try:
        local_purs = get_all_local_purchases()
        if local_purs:
            async with SessionDb3() as db3:
                for p in local_purs:
                    res = await db3.execute(select(ShopPurchaseModel).filter(ShopPurchaseModel.id == p["id"]))
                    if not res.scalars().first():
                        db3.add(ShopPurchaseModel(
                            id=p["id"],
                            supplier_name=p["supplier_name"],
                            item_name=p["item_name"],
                            quantity=p["quantity"],
                            total_cost=p["total_cost"],
                            paid_amount=p["paid_amount"],
                            remaining=p.get("remaining", 0.0),
                            notes=p.get("notes")
                        ))
                        synced_purchases += 1
                await db3.commit()
    except Exception:
        pass

    # 3. Sync Local Customer Returns to Cloud DB2
    try:
        from app.core.database import SessionDb2
        from app.models.db2_operations import CustomerReturnModel, SupplierReturnModel

        local_c_rets = get_all_local_customer_returns()
        if local_c_rets:
            async with SessionDb2() as db2:
                for r in local_c_rets:
                    res = await db2.execute(select(CustomerReturnModel).filter(CustomerReturnModel.id == r["id"]))
                    if not res.scalars().first():
                        db2.add(CustomerReturnModel(
                            id=r["id"],
                            return_code=r["return_code"],
                            customer_name=r["customer_name"],
                            customer_phone=r.get("customer_phone"),
                            original_invoice=r.get("original_invoice"),
                            items_json=r["items_json"],
                            total_value=r["total_value"],
                            refund_type=r.get("refund_type", "CASH"),
                            condition=r.get("condition", "Restocked"),
                            status=r.get("status", "Completed")
                        ))
                        synced_cust_rets += 1
                await db2.commit()
    except Exception:
        pass

    # 4. Sync Local Supplier Returns to Cloud DB2
    try:
        local_s_rets = get_all_local_supplier_returns()
        if local_s_rets:
            async with SessionDb2() as db2:
                for sr in local_s_rets:
                    res = await db2.execute(select(SupplierReturnModel).filter(SupplierReturnModel.id == sr["id"]))
                    if not res.scalars().first():
                        db2.add(SupplierReturnModel(
                            id=sr["id"],
                            return_code=sr["return_code"],
                            supplier_name=sr["supplier_name"],
                            purchase_bill=sr.get("purchase_bill"),
                            items_json=sr["items_json"],
                            total_value=sr["total_value"],
                            reason=sr.get("reason"),
                            status=sr.get("status", "Completed")
                        ))
                        synced_supp_rets += 1
                await db2.commit()
    except Exception:
        pass

    try:
        await backup_all_data_to_hard_drive()
    except Exception:
        pass

    return {
        "status": "success",
        "synced_bills": synced_bills,
        "synced_purchases": synced_purchases,
        "synced_customer_returns": synced_cust_rets,
        "synced_supplier_returns": synced_supp_rets,
        "message": f"Bi-directional synchronization complete: {synced_bills} bills, {synced_purchases} purchases, {synced_cust_rets + synced_supp_rets} returns synced."
    }
