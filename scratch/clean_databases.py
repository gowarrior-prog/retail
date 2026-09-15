import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from database import engine_db1, engine_db2, engine_db3, Base1, Base2, Base3
from sqlalchemy import text

db1_tables_to_drop = [
    "stores", "order_items", "employees", "employee_attendance", "employee_leaves",
    "salary_payouts", "billing_history", "customer_khata", "khata_transactions",
    "shop_purchases", "daily_sales_analytics", "super_admin_audit_logs"
]

db2_tables_to_drop = [
    "employee_attendance", "employee_leaves", "stores", "products", "orders",
    "order_items", "users", "billing_history", "customer_khata", "khata_transactions",
    "shop_purchases", "daily_sales_analytics", "super_admin_audit_logs"
]

db3_tables_to_drop = [
    "products", "employees", "employee_attendance", "employee_leaves", "salary_payouts",
    "stores", "orders", "order_items", "users"
]

async def clean():
    print("--- Cleaning DB1 (Catalog, Orders & Auth) ---")
    async with engine_db1.begin() as conn:
        for tbl in db1_tables_to_drop:
            try:
                await conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;'))
                print(f"[DB1] Dropped leaked table: {tbl}")
            except Exception as e:
                print(f"[DB1] Could not drop {tbl}: {e}")
        await conn.run_sync(Base1.metadata.create_all)
        print("[DB1] Created clean Base1 tables (users, products, orders)")

    print("\n--- Cleaning DB2 (Operations & HR) ---")
    async with engine_db2.begin() as conn:
        for tbl in db2_tables_to_drop:
            try:
                await conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;'))
                print(f"[DB2] Dropped leaked table: {tbl}")
            except Exception as e:
                print(f"[DB2] Could not drop {tbl}: {e}")
        await conn.run_sync(Base2.metadata.create_all)
        print("[DB2] Created clean Base2 tables (employees, salary_payouts)")

    print("\n--- Cleaning DB3 (Finance & Analytics) ---")
    async with engine_db3.begin() as conn:
        for tbl in db3_tables_to_drop:
            try:
                await conn.execute(text(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;'))
                print(f"[DB3] Dropped leaked table: {tbl}")
            except Exception as e:
                print(f"[DB3] Could not drop {tbl}: {e}")
        await conn.run_sync(Base3.metadata.create_all)
        print("[DB3] Created clean Base3 tables (billing_history, customer_khata, khata_transactions, shop_purchases, daily_sales_analytics, super_admin_audit_logs)")

    print("\n=== ALL DATABASES CLEANED AND STRICTLY ISOLATED ===")

if __name__ == "__main__":
    asyncio.run(clean())
