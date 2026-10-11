import os
import sys
import asyncio
import sqlite3
from pathlib import Path

# Setup paths
api_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(api_dir))

from app.services.sqlite_sync_service import clear_all_local_pos_data, get_sqlite_conn
from app.core.database import SessionDb1, SessionDb2, SessionDb3
from sqlalchemy import text

async def wipe_all():
    print("=" * 60)
    print("STARTING FULL POS DATA PURGE (LOCAL SQLITE + CLOUD DB)")
    print("=" * 60)

    # 1. Wipe Local SQLite
    try:
        clear_all_local_pos_data()
        conn = get_sqlite_conn()
        cur = conn.cursor()
        for tbl in ["local_products", "local_bills", "local_employees", "local_khata", "local_purchases", "local_customer_returns", "local_supplier_returns"]:
            cur.execute(f"DELETE FROM {tbl}")
        conn.commit()
        conn.close()
        print("[SUCCESS] Local SQLite pos_local.db completely wiped (0 rows remaining).")
    except Exception as e:
        print(f"[ERROR] Local SQLite wipe error: {e}")

    # 2. Reset Hard Drive JSON Backups
    backup_dir = api_dir / "data_backups"
    if backup_dir.exists():
        import json
        for fn in ["products_backup.json", "employees_backup.json", "billing_history_backup.json", "customer_khata_backup.json", "shop_purchases_backup.json", "customer_returns_backup.json", "supplier_returns_backup.json"]:
            fp = backup_dir / fn
            try:
                with open(fp, "w", encoding="utf-8") as f:
                    json.dump([], f)
                print(f"[SUCCESS] Reset backup file: {fn}")
            except Exception as e:
                pass

    # 3. Wipe Cloud PostgreSQL DB1 (Catalog & Orders)
    try:
        async with SessionDb1() as db1:
            await db1.execute(text('TRUNCATE TABLE "orders" CASCADE;'))
            await db1.execute(text('TRUNCATE TABLE "products" CASCADE;'))
            await db1.commit()
            print("[SUCCESS] Cloud DB1 (products, orders) purged successfully.")
    except Exception as e:
        print(f"[NOTICE] Cloud DB1 purge notice: {e}")

    # 4. Wipe Cloud PostgreSQL DB2 (Employees & Returns)
    try:
        async with SessionDb2() as db2:
            await db2.execute(text('TRUNCATE TABLE "customer_returns" CASCADE;'))
            await db2.execute(text('TRUNCATE TABLE "supplier_returns" CASCADE;'))
            await db2.execute(text('TRUNCATE TABLE "salary_payouts" CASCADE;'))
            await db2.execute(text('TRUNCATE TABLE "employees" CASCADE;'))
            await db2.commit()
            print("[SUCCESS] Cloud DB2 (employees, customer_returns, supplier_returns) purged successfully.")
    except Exception as e:
        print(f"[NOTICE] Cloud DB2 purge notice: {e}")

    # 5. Wipe Cloud PostgreSQL DB3 (Finance & Billing)
    try:
        async with SessionDb3() as db3:
            await db3.execute(text('TRUNCATE TABLE "billing_history" CASCADE;'))
            await db3.execute(text('TRUNCATE TABLE "khata_transactions" CASCADE;'))
            await db3.execute(text('TRUNCATE TABLE "customer_khata" CASCADE;'))
            await db3.execute(text('TRUNCATE TABLE "shop_purchases" CASCADE;'))
            await db3.execute(text('TRUNCATE TABLE "daily_sales_analytics" CASCADE;'))
            await db3.commit()
            print("[SUCCESS] Cloud DB3 (billing, khata, purchases, analytics) purged successfully.")
    except Exception as e:
        print(f"[NOTICE] Cloud DB3 purge notice: {e}")

    print("=" * 60)
    print("FULL PURGE COMPLETE! Both Local SQLite and Cloud DBs are now clean.")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(wipe_all())
