import asyncio
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

async def periodic_odoo_auto_sync():
    """Background task: Automatically syncs catalog with Odoo ERP and backs up all entities to local hard drive every 15 minutes."""
    while True:
        try:
            print("[Auto-Sync] Running background Odoo synchronization & hard drive backup...")
            res = await sync_all_odoo_products(limit=None)
            print(f"[Auto-Sync] Odoo sync status: {res.get('status')} - {res.get('message')}")
            
            backup_stats = await backup_all_data_to_hard_drive()
            print(f"[Auto-Sync] Hard drive full backup status: {backup_stats}")
        except Exception as e:
            print(f"[Auto-Sync] Background sync exception: {e}")
        
        # Sleep for 15 minutes (900 seconds)
        await asyncio.sleep(900)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Isolated schema creation per database
    async with engine_db1.begin() as conn:
        await conn.run_sync(Base1.metadata.create_all)
    async with engine_db2.begin() as conn:
        await conn.run_sync(Base2.metadata.create_all)
    async with engine_db3.begin() as conn:
        await conn.run_sync(Base3.metadata.create_all)
    
    # Run initial hard drive backup on startup
    asyncio.create_task(backup_all_data_to_hard_drive())
    
    yield

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
    return {"message": "Multi-Database Modular System API is active across DB1, DB2, and DB3!"}

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
    print(f"Starting Bilal POS Multi-Terminal Server listening on http://{host}:{port} across shop LAN...")
    uvicorn.run("main:app", host=host, port=port, reload=False)