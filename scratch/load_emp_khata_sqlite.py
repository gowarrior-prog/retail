"""Load employees and khata from JSON backups into SQLite."""
import sqlite3, json, os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "apps", "api", "data")
DB_PATH = os.path.join(DATA_DIR, "pos_local.db")

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Create tables
c.execute("""CREATE TABLE IF NOT EXISTS local_employees (
    id TEXT PRIMARY KEY, odoo_id INTEGER, name TEXT NOT NULL, job_title TEXT,
    department TEXT, phone TEXT, email TEXT, status TEXT DEFAULT 'active', updated_at TEXT NOT NULL
)""")
c.execute("""CREATE TABLE IF NOT EXISTS local_khata (
    id TEXT PRIMARY KEY, odoo_id INTEGER, name TEXT NOT NULL, phone TEXT,
    email TEXT, balance REAL DEFAULT 0.0, updated_at TEXT NOT NULL
)""")
conn.commit()

now = datetime.now().isoformat()

# Load employees
emp_path = os.path.join(DATA_DIR, "local_employees_backup.json")
if os.path.exists(emp_path):
    with open(emp_path, "r", encoding="utf-8") as f:
        emps = json.load(f)
    print(f"Employees JSON backup: {len(emps)} records")
    for e in emps:
        c.execute("""INSERT INTO local_employees (id, odoo_id, name, job_title, department, phone, email, status, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, job_title=excluded.job_title,
            phone=excluded.phone, updated_at=excluded.updated_at
        """, (str(e.get("id","")), 0, e.get("name",""), e.get("role",""), "", e.get("phone",""), "", "active", now))
    conn.commit()
    c.execute("SELECT COUNT(*) FROM local_employees")
    print(f"Employees in SQLite: {c.fetchone()[0]}")
else:
    print("No employees backup found")

# Load khata
khata_path = os.path.join(DATA_DIR, "local_khata_backup.json")
if os.path.exists(khata_path):
    with open(khata_path, "r", encoding="utf-8") as f:
        khatas = json.load(f)
    print(f"\nKhata JSON backup: {len(khatas)} records")
    for k in khatas:
        c.execute("""INSERT INTO local_khata (id, odoo_id, name, phone, email, balance, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone,
            balance=excluded.balance, updated_at=excluded.updated_at
        """, (str(k.get("id","")), 0, k.get("customer_name", k.get("name","")), k.get("phone",""), "", float(k.get("total_balance", 0) or 0), now))
    conn.commit()
    c.execute("SELECT COUNT(*) FROM local_khata")
    print(f"Khata in SQLite: {c.fetchone()[0]}")
else:
    print("No khata backup found")

conn.close()
print("\nAll data loaded into SQLite!")
