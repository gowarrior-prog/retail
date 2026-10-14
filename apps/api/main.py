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
import app.models.db1_catalog
import app.models.db2_operations
import app.models.db3_finance

from app.routers import (
    catalog_router,
    auth_router,
    employees_router,
    billing_router,
    admin_router,
    printer_router,
    ai_router,
)
from app.services.odoo_service import sync_all_odoo_products
from app.services.backup_service import backup_all_data_to_hard_drive

import os

ENABLE_ODOO_SYNC = os.getenv("ENABLE_ODOO_SYNC", "false").lower() == "true"

async def ensure_cloud_tables_exist():
    """Background task to ensure all cloud tables exist in DB1, DB2, and DB3 if configured."""
    if not engine_db2 and not engine_db3:
        print("[Offline Mode] Cloud DB not configured. Operating in full standalone local SQLite mode.")
        return

    if engine_db2:
        for attempt in range(3):
            try:
                async with engine_db2.begin() as conn:
                    await conn.run_sync(Base2.metadata.create_all)
                print("[Cloud DB2] Customer & Supplier Returns, Employees schema confirmed.")
                break
            except Exception as e:
                await asyncio.sleep(2.0)

    if engine_db3:
        for attempt in range(3):
            try:
                async with engine_db3.begin() as conn:
                    await conn.run_sync(Base3.metadata.create_all)
                print("[Cloud DB3] Shop Purchases, Billing & Khata schema confirmed.")
                break
            except Exception as e:
                await asyncio.sleep(2.0)


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


async def periodic_offline_to_cloud_sync():
    """Background task: Every 60 seconds, silently syncs any offline pending bills, purchases, and returns to cloud when internet is available."""
    from app.routers.billing import sync_pending_offline_data
    while True:
        try:
            await asyncio.sleep(60)
            await sync_pending_offline_data()
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Execute auto schema migrations synchronously on startup
    from app.services.migration_service import run_all_migrations
    try:
        mig_res = run_all_migrations()
        print(f"[Startup] Schema migrations complete: {mig_res.get('applied_count')} applied, current v{mig_res.get('current_schema_version')}")
    except Exception as e:
        print(f"[Startup Notice] Migration warning: {e}")

    # 2. Launch background ESC/POS thermal print queue worker
    from app.services.print_queue_service import start_print_worker
    start_print_worker()

    # 3. Create initial daily rolling backup snapshot with HMAC checksum
    from app.services.rolling_backup_service import create_rolling_backup
    try:
        asyncio.create_task(asyncio.to_thread(create_rolling_backup, "startup_daily"))
    except Exception:
        pass

    # 4. Launch background cloud schema verification
    asyncio.create_task(ensure_cloud_tables_exist())
    
    # 5. Run initial JSON hard drive backup on startup in background
    try:
        asyncio.create_task(backup_all_data_to_hard_drive())
    except Exception:
        pass

    # 6. Launch periodic offline-to-cloud automatic background synchronization
    asyncio.create_task(periodic_offline_to_cloud_sync())

    # 7. Launch periodic hard drive backup and optional Odoo sync
    asyncio.create_task(periodic_odoo_auto_sync())
    
    yield

    # Shutdown: Perform clean WAL checkpoint to ensure all data is flushed
    try:
        from app.services.sqlite_sync_service import checkpoint_wal_db
        checkpoint_wal_db("PASSIVE")
        print("[Shutdown] SQLite WAL checkpointed successfully.")
    except Exception as e:
        print(f"[Shutdown Notice] WAL checkpoint: {e}")


from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI(
    title="Retail Ecosystem Multi-Database Modular API",
    description="DB1 (Catalog, Orders, Users) | DB2 (Employees & Payroll) | DB3 (Billing, Khata, Purchases, Analytics)",
    lifespan=lifespan
)

from app.core.sanitizer import SanitizeInputMiddleware

# Perimeter Input Sanitization & Injection Defense Middleware
app.add_middleware(SanitizeInputMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://bilalclothpos.com",
        "http://bilalclothpos.com:3000",
        "tauri://localhost",
        "http://tauri.localhost",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|bilalclothpos\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Multi-Database Modular System API is active across DB1, DB2, and DB3!",
        "server": "Bilal Cloth POS Main Shop Server",
        "security": "SQLCipher AES-256 + HMAC-SHA256 Anti-Tamper Enabled",
    }

@app.get("/api/security/audit-logs")
async def get_system_audit_logs(limit: int = 50):
    """Fetches recent entries from the unalterable system audit log."""
    from app.services.sqlite_sync_service import get_recent_system_audit_logs
    return {
        "status": "success",
        "logs": get_recent_system_audit_logs(limit)
    }

@app.get("/api/security/verify-audit-chain")
async def verify_audit_chain():
    """Cryptographically verifies that the audit log chain is intact and uncorrupted."""
    from app.services.sqlite_sync_service import verify_system_audit_log_chain
    return verify_system_audit_log_chain()

@app.get("/api/security/verify-ledger")
async def verify_ledger():
    """Verifies SHA-256 cryptographic checksums across all financial ledgers (bills, products, khata, purchases)."""
    from app.services.sqlite_sync_service import verify_all_local_ledger_integrity
    return verify_all_local_ledger_integrity()

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
app.include_router(printer_router)
app.include_router(ai_router)

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
    if SessionDb1:
        try:
            async def check_db1():
                async with SessionDb1() as s1:
                    await s1.execute(text("SELECT 1"))
            await asyncio.wait_for(check_db1(), timeout=0.5)
            db1_online = True
        except Exception:
            pass

    db2_online = False
    if SessionDb2:
        try:
            async def check_db2():
                async with SessionDb2() as s2:
                    await s2.execute(text("SELECT 1"))
            await asyncio.wait_for(check_db2(), timeout=0.5)
            db2_online = True
        except Exception:
            pass

    db3_online = False
    if SessionDb3:
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


@app.post("/backup/rolling")
async def trigger_rolling_backup_endpoint(reason: str = "shift_close"):
    """Creates a hot SQLite snapshot with HMAC-SHA256 signature and rolling retention."""
    from app.services.rolling_backup_service import create_rolling_backup
    res = await asyncio.to_thread(create_rolling_backup, reason)
    return res


@app.get("/backup/rolling")
async def list_rolling_backups_endpoint():
    """Returns list of rolling SQLite backups with integrity status."""
    from app.services.rolling_backup_service import list_rolling_backups
    backups = list_rolling_backups()
    return {"status": "success", "total": len(backups), "backups": backups}


@app.get("/backup/verify/{filename}")
async def verify_backup_endpoint(filename: str):
    """Cryptographically verifies a specific backup's HMAC checksum and SQLite integrity."""
    from app.services.rolling_backup_service import verify_backup_file
    res = verify_backup_file(filename)
    return res



if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="Bilal Cloth POS Backend API Sidecar")
    parser.add_argument("--host", default=os.getenv("API_HOST", "0.0.0.0"), help="Host to bind")
    parser.add_argument("--port", type=int, default=int(os.getenv("API_PORT", "8000")), help="Port to listen on")
    parser.add_argument("--data-dir", default=os.getenv("POS_DATA_DIR", ""), help="AppData directory for SQLite")
    args, _ = parser.parse_known_args()

    if args.data_dir:
        os.environ["POS_DATA_DIR"] = args.data_dir

    print(f"Starting High-Speed Bilal POS Sidecar Server listening on http://{args.host}:{args.port}...")
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=False,
        access_log=False,
        limit_concurrency=1000,
        timeout_keep_alive=120,
        backlog=2048
    )