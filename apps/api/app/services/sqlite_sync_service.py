import os
import sqlite3
import json
import uuid
import hashlib
import hmac
from datetime import datetime

SYSTEM_SECRET = os.getenv("SECURITY_HMAC_SECRET", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#")

def get_sqlite_path() -> str:
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    return os.path.join(data_dir, "pos_local.db")

def calculate_checksum(data_str: str) -> str:
    """Generates SHA-256 HMAC signature to detect local database tampering."""
    return hmac.new(SYSTEM_SECRET.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha256).hexdigest()

def init_sqlite_db():
    """Initializes local SQLite database schemas with tampering protection columns."""
    db_path = get_sqlite_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Local Bills Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_bills (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        customer_phone TEXT,
        total_amount REAL NOT NULL,
        discount REAL DEFAULT 0.0,
        tax REAL DEFAULT 0.0,
        payment_mode TEXT DEFAULT 'CASH',
        cashier_name TEXT,
        item_details_json TEXT NOT NULL,
        sync_status TEXT DEFAULT 'PENDING',
        checksum TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # Local Products Table with Security Checksum
    cursor.execute("""
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

    # Local Employees Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_employees (
        id TEXT PRIMARY KEY,
        odoo_id INTEGER,
        name TEXT NOT NULL,
        job_title TEXT,
        department TEXT,
        phone TEXT,
        email TEXT,
        status TEXT DEFAULT 'active',
        updated_at TEXT NOT NULL
    )
    """)

    # Local Khata (Credit Customers) Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_khata (
        id TEXT PRIMARY KEY,
        odoo_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        balance REAL DEFAULT 0.0,
        updated_at TEXT NOT NULL
    )
    """)

    # Security Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        target_id TEXT,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()
    conn.close()

def save_bill_locally(invoice_number: str, customer_phone: str, total_amount: float, discount: float, tax: float, payment_mode: str, cashier_name: str, item_details_json: str) -> dict:
    """
    Saves a bill locally into SQLite FIRST before syncing to remote database.
    Calculates cryptographic checksum to prevent tampering.
    """
    init_sqlite_db()
    bill_id = str(uuid.uuid4())
    now_str = datetime.now().isoformat()

    raw_payload = f"{bill_id}:{invoice_number}:{total_amount}:{payment_mode}:{cashier_name}"
    checksum = calculate_checksum(raw_payload)

    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO local_bills (id, invoice_number, customer_phone, total_amount, discount, tax, payment_mode, cashier_name, item_details_json, sync_status, checksum, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    """, (bill_id, invoice_number, customer_phone, total_amount, discount, tax, payment_mode, cashier_name, item_details_json, checksum, now_str))

    conn.commit()
    conn.close()

    return {
        "id": bill_id,
        "invoice_number": invoice_number,
        "sync_status": "PENDING",
        "checksum": checksum,
        "saved_locally": True
    }

def save_product_locally(product_id: str, odoo_id: int | None, name: str, price: float, cost_price: float | None, sku: str, barcode: str | None, category: str | None, stock: int | None) -> dict:
    """
    Saves or updates a product in local SQLite with cryptographic HMAC checksum to prevent local price tampering.
    """
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    raw_payload = f"{product_id}:{name}:{price}:{sku}"
    checksum = calculate_checksum(raw_payload)

    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO local_products (id, odoo_id, name, price, cost_price, sku, barcode, category, stock, checksum, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            odoo_id=excluded.odoo_id,
            name=excluded.name,
            price=excluded.price,
            cost_price=excluded.cost_price,
            sku=excluded.sku,
            barcode=excluded.barcode,
            category=excluded.category,
            stock=excluded.stock,
            checksum=excluded.checksum,
            updated_at=excluded.updated_at
    """, (product_id, odoo_id or 0, name, price, cost_price or 0.0, sku, barcode or "", category or "General", stock or 0, checksum, now_str))

    conn.commit()
    conn.close()

    return {"id": product_id, "name": name, "price": price, "checksum": checksum, "saved_locally": True}

def verify_product_integrity(product_id: str, name: str, price: float, sku: str, stored_checksum: str) -> bool:
    """
    Validates HMAC checksum of a product to detect unauthorized local price editing.
    """
    expected_checksum = calculate_checksum(f"{product_id}:{name}:{price}:{sku}")
    return hmac.compare_digest(expected_checksum, stored_checksum)

def log_security_event(event_type: str, target_id: str, details: str):
    """Logs security violations (e.g. price tampering attempts)."""
    init_sqlite_db()
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO security_audit_logs (id, event_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (str(uuid.uuid4()), event_type, target_id, details, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_pending_local_bills() -> list:
    """Fetches all local bills that are pending remote database sync."""
    init_sqlite_db()
    conn = sqlite3.connect(get_sqlite_path())
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_bills WHERE sync_status = 'PENDING'")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def mark_bill_as_synced(bill_id: str):
    """Marks a local bill as SYNCED after remote database confirmation."""
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("UPDATE local_bills SET sync_status = 'SYNCED' WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()

def get_all_local_products() -> list:
    """Fetches all products stored in local SQLite database (pos_local.db)."""
    init_sqlite_db()
    conn = sqlite3.connect(get_sqlite_path())
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_products ORDER BY updated_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

# ── Employee SQLite CRUD ──────────────────────────────────────

def save_employee_locally(emp_id: str, odoo_id: int | None, name: str, job_title: str | None, department: str | None, phone: str | None, email: str | None, status: str = "active") -> dict:
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_employees (id, odoo_id, name, job_title, department, phone, email, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            odoo_id=excluded.odoo_id, name=excluded.name, job_title=excluded.job_title,
            department=excluded.department, phone=excluded.phone, email=excluded.email,
            status=excluded.status, updated_at=excluded.updated_at
    """, (emp_id, odoo_id or 0, name, job_title or "", department or "", phone or "", email or "", status, now_str))
    conn.commit()
    conn.close()
    return {"id": emp_id, "name": name, "saved_locally": True}

def get_all_local_employees() -> list:
    init_sqlite_db()
    conn = sqlite3.connect(get_sqlite_path())
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_employees ORDER BY name ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_employee(emp_id: str):
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()

# ── Khata SQLite CRUD ──────────────────────────────────────

def save_khata_locally(cust_id: str, odoo_id: int | None, name: str, phone: str | None, email: str | None, balance: float = 0.0) -> dict:
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_khata (id, odoo_id, name, phone, email, balance, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            odoo_id=excluded.odoo_id, name=excluded.name, phone=excluded.phone,
            email=excluded.email, balance=excluded.balance, updated_at=excluded.updated_at
    """, (cust_id, odoo_id or 0, name, phone or "", email or "", balance, now_str))
    conn.commit()
    conn.close()
    return {"id": cust_id, "name": name, "saved_locally": True}

def get_all_local_khata() -> list:
    init_sqlite_db()
    conn = sqlite3.connect(get_sqlite_path())
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_khata ORDER BY name ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_khata(cust_id: str):
    conn = sqlite3.connect(get_sqlite_path())
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_khata WHERE id = ?", (cust_id,))
    conn.commit()
    conn.close()

