import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import (
    Base1, Base2, Base3,
    engine_db1, engine_db2, engine_db3
)
from app.routers import (
    catalog_router,
    auth_router,
    employees_router,
    billing_router,
    admin_router
)
from app.services.odoo_service import sync_all_odoo_products
from app.services.backup_service import backup_all_data_to_hard_drive

import os

ENABLE_ODOO_SYNC = os.getenv("ENABLE_ODOO_SYNC", "false").lower() == "true"

async def periodic_odoo_auto_sync():
    """Background task: Automatically backs up data to local hard drive and syncs Odoo only if explicitly enabled."""
    while True:
        try:
            if ENABLE_ODOO_SYNC:
                print("[Auto-Sync] Running background Odoo synchronization...")
                res = await sync_all_odoo_products(limit=None)
                print(f"[Auto-Sync] Odoo sync status: {res.get('status')} - {res.get('message')}")

            backup_stats = await backup_all_data_to_hard_drive()
            print(f"[Auto-Sync] Hard drive full backup completed successfully.")
        except Exception as e:
            pass

        # Sleep for 15 minutes (900 seconds)
        await asyncio.sleep(900)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fast non-blocking schema check per database (max 0.8s timeout)
    try:
        async def init_db1():
            async with engine_db1.begin() as conn:
                await conn.run_sync(Base1.metadata.create_all)
        await asyncio.wait_for(init_db1(), timeout=0.8)
    except Exception as e:
        print(f"Notice: DB1 running in local SQLite mode.")

    try:
        async def init_db2():
            async with engine_db2.begin() as conn:
                await conn.run_sync(Base2.metadata.create_all)
        await asyncio.wait_for(init_db2(), timeout=0.8)
    except Exception as e:
        print(f"Notice: DB2 running in local SQLite mode.")

    try:
        async def init_db3():
            async with engine_db3.begin() as conn:
                await conn.run_sync(Base3.metadata.create_all)
        await asyncio.wait_for(init_db3(), timeout=0.8)
    except Exception as e:
        print(f"Notice: DB3 running in local SQLite mode.")
    
    # Run initial hard drive backup on startup in background
    try:
        asyncio.create_task(backup_all_data_to_hard_drive())
    except Exception:
        pass
    
    yield

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI(
    title="Retail Ecosystem Multi-Database Modular API",
    description="DB1 (Catalog, Orders, Users) | DB2 (Employees & Payroll) | DB3 (Billing, Khata, Purchases, Analytics)",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Multi-Database Modular System API is active across DB1, DB2, and DB3!",
        "server": "Bilal Cloth POS Main Shop Server",
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        pass

# Register Modular Routers
app.include_router(catalog_router)
app.include_router(auth_router)
app.include_router(employees_router)
app.include_router(billing_router)
app.include_router(admin_router)

from app.services.backup_service import backup_all_data_to_hard_drive, get_offline_data_summary

@app.get("/offline-summary")
async def get_offline_summary():
    """Returns local hard drive file inspection summary for POS UI display and 2nd PC network access."""
    return get_offline_data_summary()

from app.services.sqlite_sync_service import get_pending_local_bills
from sqlalchemy import text

@app.get("/system-status")
async def get_system_status():
    """Diagnostic status for POS UI: checks local SQLite and Supabase Cloud DB connectivity."""
    from app.services.sqlite_sync_service import get_sqlite_conn

    # Check SQLite local counts (takes < 1ms)
    sqlite_stats = {"status": "ONLINE", "products": 0, "employees": 0, "khata": 0, "bills": 0}
    try:
        conn = get_sqlite_conn()
        c = conn.cursor()
        sqlite_stats["products"] = c.execute("SELECT count(*) FROM local_products").fetchone()[0]
        sqlite_stats["employees"] = c.execute("SELECT count(*) FROM local_employees").fetchone()[0]
        sqlite_stats["khata"] = c.execute("SELECT count(*) FROM local_khata").fetchone()[0]
        sqlite_stats["bills"] = c.execute("SELECT count(*) FROM local_bills").fetchone()[0]
        conn.close()
    except Exception as sq_err:
        sqlite_stats["status"] = f"ERROR: {sq_err}"

    # Fast non-blocking checks for cloud DBs (max 0.5s each)
    db1_online = False
    try:
        async def check_db1():
            async with SessionDb1() as s1:
                await s1.execute(text("SELECT 1"))
        await asyncio.wait_for(check_db1(), timeout=0.5)
        db1_online = True
    except Exception:
        pass

    db2_online = False
    try:
        async def check_db2():
            async with SessionDb2() as s2:
                await s2.execute(text("SELECT 1"))
        await asyncio.wait_for(check_db2(), timeout=0.5)
        db2_online = True
    except Exception:
        pass

    db3_online = False
    try:
        async def check_db3():
            async with SessionDb3() as s3:
                await s3.execute(text("SELECT 1"))
        await asyncio.wait_for(check_db3(), timeout=0.5)
        db3_online = True
    except Exception:
        pass

    pending_bills = get_pending_local_bills()
    return {
        "status": "online",
        "sqlite_local": sqlite_stats,
        "cloud_db_connected": db1_online or db2_online or db3_online,
        "db1_catalog_online": db1_online,
        "db2_employees_online": db2_online,
        "db3_finance_online": db3_online,
        "pending_bills_count": len(pending_bills),
        "server": "Bilal Cloth POS Main Shop Server",
    }

@app.post("/backup-now")
async def trigger_manual_backup():
    """Triggers an instant complete backup of all 5 modules (Products, Employees, Invoices, Khata, Purchases) to local hard drive."""
    stats = await backup_all_data_to_hard_drive()
    summary = get_offline_data_summary()
    return {"status": "success", "message": "All database entities (Products, Employees, Invoices, Khata Ledger, Purchases) successfully backed up to local hard drive!", "stats": stats, "summary": summary}


if __name__ == "__main__":
    import os
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    print(f"Starting High-Speed Scalable Bilal POS Server listening on http://{host}:{port}...")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        access_log=False,
        limit_concurrency=1000,
        timeout_keep_alive=120,
        backlog=2048
    )