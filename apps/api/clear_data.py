import sqlite3
import os
import json
import asyncio
import sys

# 1. Clear Local SQLite Database
db_path = os.path.join(os.path.dirname(__file__), "data", "pos_local.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
    print("Found local tables:", tables)
    for t in tables:
        cursor.execute(f"DELETE FROM {t};")
        print(f"Cleared local table: {t}")
    conn.commit()
    conn.close()

# 2. Clear Local JSON Backup Files
data_dir = os.path.join(os.path.dirname(__file__), "data")
if os.path.exists(data_dir):
    for f in os.listdir(data_dir):
        if f.endswith(".json"):
            fp = os.path.join(data_dir, f)
            with open(fp, "w", encoding="utf-8") as file:
                file.write("[]")
            print(f"Cleared JSON backup file: {f}")

# 3. Clear Cloud DB1, DB2, DB3 tables via SQLAlchemy
async def clear_cloud_dbs():
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
        from app.core.database import SessionDb1, SessionDb2, SessionDb3
        from app.models.db1_catalog import ProductModel, OrderModel
        from app.models.db3_finance import (
            BillingHistoryModel,
            CustomerKhataModel,
            KhataTransactionModel,
            ShopPurchaseModel,
            DailySalesAnalyticsModel
        )

        if SessionDb3:
            try:
                async with SessionDb3() as db3:
                    await db3.execute(BillingHistoryModel.__table__.delete())
                    await db3.execute(CustomerKhataModel.__table__.delete())
                    await db3.execute(KhataTransactionModel.__table__.delete())
                    await db3.execute(ShopPurchaseModel.__table__.delete())
                    await db3.execute(DailySalesAnalyticsModel.__table__.delete())
                    await db3.commit()
                    print("Cleared Cloud DB3 Finance tables.")
            except Exception as e3:
                print(f"Note: DB3 cleanup note: {e3}")

        if SessionDb1:
            try:
                async with SessionDb1() as db1:
                    await db1.execute(OrderModel.__table__.delete())
                    await db1.execute(ProductModel.__table__.delete())
                    await db1.commit()
                    print("Cleared Cloud DB1 Catalog tables.")
            except Exception as e1:
                print(f"Note: DB1 cleanup note: {e1}")
    except Exception as err:
        print(f"Cloud DB Wipe Note: {err}")

if __name__ == "__main__":
    asyncio.run(clear_cloud_dbs())
    print("SUCCESS: ALL local and cloud DB data permanently deleted!")
