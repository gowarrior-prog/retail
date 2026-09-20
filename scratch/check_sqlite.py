import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "apps", "api", "data", "pos_local.db")
print(f"SQLite DB: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")
print(f"Size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Check tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print(f"\nTables: {[t[0] for t in tables]}")

# Count products
c.execute("SELECT COUNT(*) FROM local_products")
prod_count = c.fetchone()[0]
print(f"\nProducts in SQLite: {prod_count}")

# Count bills
c.execute("SELECT COUNT(*) FROM local_bills")
bill_count = c.fetchone()[0]
print(f"Bills in SQLite: {bill_count}")

# Show sample products
if prod_count > 0:
    c.execute("SELECT id, name, price, category, barcode FROM local_products LIMIT 5")
    rows = c.fetchall()
    print(f"\nSample products:")
    for r in rows:
        print(f"  - {r[1]} | Rs. {r[2]} | {r[3]} | Barcode: {r[4]}")

# Show pending bills
c.execute("SELECT COUNT(*) FROM local_bills WHERE sync_status='PENDING'")
pending = c.fetchone()[0]
print(f"\nPending (unsynced) bills: {pending}")

conn.close()
print("\n[OK] SQLite database verification complete!")

