from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.core.database import SessionDb1, SessionDb2, SessionDb3
from app.services.sqlite_sync_service import clear_all_local_pos_data
from app.services.odoo.odoo_catalog import sync_all_odoo_products
from app.services.odoo.odoo_finance import (
    sync_odoo_employees,
    sync_odoo_khata,
    sync_odoo_purchases,
    sync_odoo_orders
)
from app.routers.catalog import invalidate_product_cache
from app.routers.employees import invalidate_employee_cache
from app.routers.billing import invalidate_khata_cache, invalidate_purchase_cache, invalidate_billing_cache

router = APIRouter(prefix="/admin", tags=["Super Admin Maintenance"])

@router.delete("/purge-table")
async def super_admin_purge_table(
    target_db: str = Query(..., description="db1, db2, or db3"),
    table_name: str = Query(..., description="Exact table name to purge e.g. products, employees, billing_history"),
    admin_secret: str = Query(..., description="Super Admin authorization key")
):
    if admin_secret != "SUPER_ADMIN_SECRET_KEY":
        raise HTTPException(status_code=403, detail="Unauthorized Super Admin access")

    session_map = {
        "db1": SessionDb1,
        "db2": SessionDb2,
        "db3": SessionDb3
    }
    if target_db.lower() not in session_map:
        raise HTTPException(status_code=400, detail="Invalid target_db. Must be db1, db2, or db3.")

    SessionClass = session_map[target_db.lower()]
    async with SessionClass() as db:
        try:
            await db.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))
            await db.commit()
            return {"message": f"Successfully purged table '{table_name}' in '{target_db}'."}
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to purge table: {str(e)}")


@router.post("/wipe-and-sync-odoo")
async def wipe_and_sync_all_odoo(wipe_old_data: bool = True):
    """
    1-Click Master Endpoint:
    1. Wipes old POS data (SQLite local database & RAM caches).
    2. Connects to Odoo ERP (http://192.168.100.2:8069).
    3. Imports ALL Products, Staff/Employees, Khata Receivables, Purchases, and Sales Orders.
    4. Invalidates all caches so Analytics, POS counter, and Khata reflect real-time live data.
    """
    results = {}

    # Step 1: Wipe old local data if requested
    if wipe_old_data:
        try:
            clear_all_local_pos_data()
            invalidate_product_cache()
            invalidate_employee_cache()
            invalidate_khata_cache()
            invalidate_purchase_cache()
            invalidate_billing_cache()
            results["wipe_status"] = "Successfully wiped all old local POS data."
        except Exception as err:
            results["wipe_status"] = f"Wipe warning: {err}"

    # Step 2: Sync Products
    prod_res = await sync_all_odoo_products()
    results["products"] = prod_res

    # Step 3: Sync Staff / Employees
    emp_res = await sync_odoo_employees()
    results["employees"] = emp_res

    # Step 4: Sync Khata Receivables
    khata_res = await sync_odoo_khata()
    results["khata"] = khata_res

    # Step 5: Sync Purchase Orders
    pur_res = await sync_odoo_purchases()
    results["purchases"] = pur_res

    # Step 6: Sync Sales Orders & Invoices (powers Real-Time Analytics)
    sales_res = await sync_odoo_orders()
    results["sales_orders"] = sales_res

    is_any_success = any(
        isinstance(r, dict) and r.get("status") == "success"
        for r in [prod_res, emp_res, khata_res, pur_res, sales_res]
    )

    return {
        "status": "success" if is_any_success else "partial_or_offline",
        "message": "Full Odoo ERP synchronization executed.",
        "results": results
    }
