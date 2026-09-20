"""
Bulk-load ALL products from local_catalog_backup.json into SQLite pos_local.db
so offline mode has the complete 8000-product catalog.
"""
import sqlite3, json, os, hashlib, hmac
from datetime import datetime

SYSTEM_SECRET = "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "apps", "api", "data")
DB_PATH = os.path.join(DATA_DIR, "pos_local.db")
BACKUP_PATH = os.path.join(DATA_DIR, "local_catalog_backup.json")

def calc_checksum(data_str):
    return hmac.new(SYSTEM_SECRET.encode(), data_str.encode(), hashlib.sha256).hexdigest()

# Init table
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS local_products (
    id TEXT PRIMARY KEY,
    odoo_id INTEGER,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    cost_price REAL DEFAULT 0.0,
    sku TEXT NOT NULL,
    barcode TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    checksum TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""")
conn.commit()

# Load JSON backup
with open(BACKUP_PATH, "r", encoding="utf-8") as f:
    products = json.load(f)

print(f"JSON backup has {len(products)} products")
print(f"SQLite DB: {DB_PATH}")

now_str = datetime.now().isoformat()
inserted = 0
updated = 0
errors = 0

for p in products:
    try:
        pid = str(p.get("id", ""))
        name = p.get("name", "Unknown")
        price = float(p.get("price", 0) or 0)
        cost_price = float(p.get("cost_price", 0) or 0)
        sku = p.get("sku") or p.get("barcode") or pid[:8]
        barcode = p.get("barcode") or ""
        category = p.get("category") or "General"
        stock = int(p.get("stock", 0) or 0)
        odoo_id = int(p.get("odoo_id", 0) or 0)

        raw = f"{pid}:{name}:{price}:{sku}"
        checksum = calc_checksum(raw)

        c.execute("""
            INSERT INTO local_products (id, odoo_id, name, price, cost_price, sku, barcode, category, stock, checksum, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                odoo_id=excluded.odoo_id, name=excluded.name, price=excluded.price,
                cost_price=excluded.cost_price, sku=excluded.sku, barcode=excluded.barcode,
                category=excluded.category, stock=excluded.stock, checksum=excluded.checksum,
                updated_at=excluded.updated_at
        """, (pid, odoo_id, name, price, cost_price, sku, barcode, category, stock, checksum, now_str))
        inserted += 1
    except Exception as e:
        errors += 1
        if errors <= 3:
            print(f"  Error on product {p.get('name','?')}: {e}")

conn.commit()

# Verify
c.execute("SELECT COUNT(*) FROM local_products")
total = c.fetchone()[0]
print(f"\nResult: {inserted} products loaded, {errors} errors")
print(f"Total products now in SQLite: {total}")

# DB file size
size_mb = os.path.getsize(DB_PATH) / (1024*1024)
print(f"SQLite DB size: {size_mb:.2f} MB")

conn.close()
print("\nDone! All products loaded into SQLite for offline use.")
