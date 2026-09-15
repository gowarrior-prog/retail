import os
import json
from sqlalchemy.future import select

from app.core.database import SessionDb1, SessionDb2, SessionDb3
from app.models.db1_catalog import ProductModel
from app.models.db2_operations import EmployeeModel
from app.models.db3_finance import BillingHistoryModel, CustomerKhataModel, ShopPurchaseModel

def get_data_dir() -> str:
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir

async def backup_all_data_to_hard_drive() -> dict:
    """
    Exports all 5 core system modules (Products, Employees, Invoices, Khata Ledger, Shop Purchases)
    into local hard drive JSON backup files under apps/api/data/.
    """
    data_dir = get_data_dir()
    stats = {}

    # 1. Products Catalog Backup (DB1)
    try:
        async with SessionDb1() as db1:
            res1 = await db1.execute(select(ProductModel))
            products = res1.scalars().all()
            p_list = [{
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price": p.price,
                "cost_price": p.cost_price,
                "profit_margin": p.profit_margin,
                "stock": p.stock,
                "sku": p.sku,
                "barcode": p.barcode,
                "category": p.category,
                "image_url": p.image_url,
                "odoo_id": p.odoo_id,
                "created_at": str(p.created_at) if p.created_at else None,
                "updated_at": str(p.updated_at) if p.updated_at else None
            } for p in products]
            
            with open(os.path.join(data_dir, "local_catalog_backup.json"), "w", encoding="utf-8") as f:
                json.dump(p_list, f, indent=2, ensure_ascii=False)
            stats["products"] = len(p_list)
    except Exception as e:
        stats["products_error"] = str(e)

    # 2. Employees Backup (DB2)
    try:
        async with SessionDb2() as db2:
            res2 = await db2.execute(select(EmployeeModel))
            employees = res2.scalars().all()
            e_list = [{
                "id": e.id,
                "name": e.name,
                "phone": e.phone,
                "cnic": e.cnic,
                "role": e.role,
                "base_salary": e.base_salary,
                "is_deleted": e.is_deleted,
                "attendance_status": e.attendance_status,
                "attendance_notes": e.attendance_notes,
                "leave_status": e.leave_status,
                "leave_reason": e.leave_reason,
                "created_at": str(e.created_at) if e.created_at else None,
            } for e in employees]
            
            with open(os.path.join(data_dir, "local_employees_backup.json"), "w", encoding="utf-8") as f:
                json.dump(e_list, f, indent=2, ensure_ascii=False)
            stats["employees"] = len(e_list)
    except Exception as e:
        stats["employees_error"] = str(e)

    # 3. Billing & Invoices Backup (DB3)
    try:
        async with SessionDb3() as db3:
            res3 = await db3.execute(select(BillingHistoryModel))
            invoices = res3.scalars().all()
            b_list = [{
                "id": b.id,
                "invoice_number": b.invoice_number,
                "customer_phone": b.customer_phone,
                "total_amount": b.total_amount,
                "discount": b.discount,
                "tax": b.tax,
                "payment_mode": b.payment_mode,
                "cashier_name": b.cashier_name,
                "item_details_json": b.item_details_json,
                "billing_date": str(b.billing_date) if b.billing_date else None,
                "created_at": str(b.created_at) if b.created_at else None,
            } for b in invoices]
            
            with open(os.path.join(data_dir, "local_billing_backup.json"), "w", encoding="utf-8") as f:
                json.dump(b_list, f, indent=2, ensure_ascii=False)
            stats["billing_history"] = len(b_list)
    except Exception as e:
        stats["billing_error"] = str(e)

    # 4. Customer Khata Backup (DB3)
    try:
        async with SessionDb3() as db3:
            res4 = await db3.execute(select(CustomerKhataModel))
            khatas = res4.scalars().all()
            k_list = [{
                "id": k.id,
                "customer_name": k.customer_name,
                "phone": k.phone,
                "total_balance": k.total_balance,
                "created_at": str(k.created_at) if k.created_at else None,
            } for k in khatas]
            
            with open(os.path.join(data_dir, "local_khata_backup.json"), "w", encoding="utf-8") as f:
                json.dump(k_list, f, indent=2, ensure_ascii=False)
            stats["customer_khata"] = len(k_list)
    except Exception as e:
        stats["khata_error"] = str(e)

    # 5. Shop Purchases Backup (DB3)
    try:
        async with SessionDb3() as db3:
            res5 = await db3.execute(select(ShopPurchaseModel))
            purchases = res5.scalars().all()
            pur_list = [{
                "id": p.id,
                "supplier_name": p.supplier_name,
                "item_name": p.item_name,
                "quantity": p.quantity,
                "total_cost": p.total_cost,
                "paid_amount": p.paid_amount,
                "remaining": p.remaining,
                "notes": p.notes,
                "purchase_date": str(p.purchase_date) if p.purchase_date else None,
                "created_at": str(p.created_at) if p.created_at else None,
            } for p in purchases]
            
            with open(os.path.join(data_dir, "local_purchases_backup.json"), "w", encoding="utf-8") as f:
                json.dump(pur_list, f, indent=2, ensure_ascii=False)
            stats["shop_purchases"] = len(pur_list)
    except Exception as e:
        stats["purchases_error"] = str(e)

    print(f"Unified Local Hard Drive Backup Complete: {stats}")
    return stats

def load_local_backup_fallback(entity_name: str) -> list:
    """Helper to read from local disk JSON backup when database is offline."""
    filename_map = {
        "catalog": "local_catalog_backup.json",
        "employees": "local_employees_backup.json",
        "billing": "local_billing_backup.json",
        "khata": "local_khata_backup.json",
        "purchases": "local_purchases_backup.json"
    }
    fname = filename_map.get(entity_name)
    if not fname:
        return []
    path = os.path.join(get_data_dir(), fname)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading local backup {fname}: {e}")
    return []

def get_offline_data_summary() -> dict:
    """Returns a full inspection summary of all local hard drive backups for display on POS UI & 2nd PC sharing."""
    data_dir = get_data_dir()
    entities = {
        "catalog": "local_catalog_backup.json",
        "employees": "local_employees_backup.json",
        "billing": "local_billing_backup.json",
        "khata": "local_khata_backup.json",
        "purchases": "local_purchases_backup.json"
    }
    summary = {}
    for key, filename in entities.items():
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            try:
                size_kb = round(os.path.getsize(path) / 1024, 2)
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                summary[key] = {
                    "status": "available",
                    "file_name": filename,
                    "file_path": path,
                    "size_kb": f"{size_kb} KB",
                    "item_count": len(data) if isinstance(data, list) else 0
                }
            except Exception as e:
                summary[key] = {"status": "error", "error": str(e)}
        else:
            summary[key] = {"status": "empty", "item_count": 0}
    return summary
