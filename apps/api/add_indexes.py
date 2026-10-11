import re

file_path = r"d:\webapp\retail-ecosystem\apps\api\app\services\sqlite_sync_service.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

index_code = """
def init_sqlite_db():
    \"\"\"Initializes local SQLite database schemas with tampering protection columns and 0ms search indexes.\"\"\"
    conn = get_sqlite_conn()
    _create_tables(conn)
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_barcode ON local_products(barcode);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON local_products(sku);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_name ON local_products(name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON local_products(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON local_bills(invoice_number);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON local_bills(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_sync_status ON local_bills(sync_status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_khata_name ON local_khata(name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_khata_phone ON local_khata(phone);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON local_purchases(supplier_name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON local_purchases(created_at);")
    conn.commit()
    conn.close()
"""

pattern = r"def init_sqlite_db\(\):[\s\S]*?conn\.close\(\)"
if re.search(pattern, content):
    new_content = re.sub(pattern, index_code.strip(), content)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully updated sqlite_sync_service.py with database indexes!")
else:
    print("Pattern not found")
