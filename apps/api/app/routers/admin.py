from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.core.database import SessionDb1, SessionDb2, SessionDb3
from app.services.sqlite_sync_service import clear_all_local_pos_data
from app.services.odoo.odoo_client import (
    test_odoo_connection,
    get_odoo_config,
    set_odoo_config,
    ODOO_URL
)
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

class OdooConfigRequest(BaseModel):
    odoo_url: Optional[str] = None
    odoo_db: Optional[str] = None
    odoo_user: Optional[str] = None
    odoo_pass: Optional[str] = None

class OdooSyncPayload(BaseModel):
    wipe_old_data: bool = True
    odoo_url: Optional[str] = None
    odoo_db: Optional[str] = None
    odoo_user: Optional[str] = None
    odoo_pass: Optional[str] = None

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


@router.get("/odoo-config")
async def get_odoo_configuration():
    return get_odoo_config()


@router.post("/test-odoo-connection")
async def test_odoo_conn_endpoint(req: Optional[OdooConfigRequest] = None):
    url = req.odoo_url if req else None
    db = req.odoo_db if req else None
    user = req.odoo_user if req else None
    pwd = req.odoo_pass if req else None
    return test_odoo_connection(url=url, db=db, user=user, password=pwd)


@router.post("/wipe-and-sync-odoo")
async def wipe_and_sync_all_odoo(
    wipe_old_data: bool = True,
    payload: Optional[OdooSyncPayload] = None
):
    """
    1-Click Master Endpoint:
    1. Wipes old POS data (SQLite local database & RAM caches).
    2. Connects to Odoo ERP (configurable URL / DB / Credentials).
    3. Imports ALL Products, Staff/Employees, Khata Receivables, Purchases, and Sales Orders.
    4. Invalidates all caches so Analytics, POS counter, and Khata reflect real-time live data.
    """
    should_wipe = payload.wipe_old_data if payload else wipe_old_data

    # Apply custom credentials if provided
    if payload:
        if payload.odoo_url or payload.odoo_db or payload.odoo_user or payload.odoo_pass:
            set_odoo_config(
                url=payload.odoo_url,
                db=payload.odoo_db,
                user=payload.odoo_user,
                password=payload.odoo_pass
            )

    results = {}

    # Step 1: Wipe old local data if requested
    if should_wipe:
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

    imported_summary = []
    if isinstance(prod_res, dict) and prod_res.get("status") == "success":
        imported_summary.append(f"{prod_res.get('total_fetched', 0)} Products")
    if isinstance(emp_res, dict) and emp_res.get("status") == "success":
        imported_summary.append(f"{emp_res.get('imported', 0)} Employees")
    if isinstance(khata_res, dict) and khata_res.get("status") == "success":
        imported_summary.append(f"{khata_res.get('imported', 0)} Khata Clients")
    if isinstance(pur_res, dict) and pur_res.get("status") == "success":
        imported_summary.append(f"{pur_res.get('imported', 0)} Purchases")
    if isinstance(sales_res, dict) and sales_res.get("status") == "success":
        imported_summary.append(f"{sales_res.get('imported', 0)} Orders")

    msg = f"Odoo Sync Complete: {', '.join(imported_summary)}" if imported_summary else "Odoo ERP synchronization finished."

    return {
        "status": "success" if is_any_success else "partial_or_offline",
        "message": msg,
        "results": results
    }
