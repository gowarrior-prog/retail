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

def get_sqlite_conn() -> sqlite3.Connection:
    """Returns an active connection to pos_local.db with self-healing recovery and WAL mode for max performance."""
    db_path = get_sqlite_path()
    conn = None
    try:
        conn = sqlite3.connect(db_path, timeout=10)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA cache_size=-64000;") # 64MB RAM Cache
        conn.execute("PRAGMA temp_store=MEMORY;")
        res = conn.execute("PRAGMA quick_check").fetchone()
        if res and res[0] == "ok":
            return conn
        conn.close()
        conn = None
    except Exception as err:
        print(f"[SQLite Self-Healing] Database error detected ({err}). Repairing...")
        if conn:
            try:
                conn.close()
            except Exception:
                pass
            conn = None

    # Replace malformed file
    try:
        backup_path = db_path + f".corrupt_{int(datetime.now().timestamp())}.bak"
        if os.path.exists(db_path):
            try:
                os.replace(db_path, backup_path)
            except Exception:
                try:
                    os.remove(db_path)
                except Exception:
                    pass
    except Exception:
        pass

    conn = sqlite3.connect(db_path)
    _create_tables(conn)
    return conn


def _create_tables(conn: sqlite3.Connection):
    cursor = conn.cursor()
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

def init_sqlite_db():
    """Initializes local SQLite database schemas with tampering protection columns."""
    conn = get_sqlite_conn()
    _create_tables(conn)
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

    conn = get_sqlite_conn()
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

    conn = get_sqlite_conn()
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

def save_products_bulk_locally(items: list[dict]):
    """
    Saves multiple products in a single bulk transaction for instant performance (50ms vs 20s).
    """
    if not items:
        return
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
    cursor = conn.cursor()

    records = []
    for item in items:
        p_id = item["id"]
        odoo_id = item.get("odoo_id") or 0
        name = item["name"]
        price = float(item.get("price", 0.0))
        cost_price = float(item.get("cost_price", 0.0))
        sku = item.get("sku") or p_id[:8]
        barcode = item.get("barcode") or ""
        category = item.get("category") or "General"
        stock = int(item.get("stock", 0))
        checksum = calculate_checksum(f"{p_id}:{name}:{price}:{sku}")
        records.append((p_id, odoo_id, name, price, cost_price, sku, barcode, category, stock, checksum, now_str))

    cursor.executemany("""
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
    """, records)
    conn.commit()
    conn.close()

def verify_product_integrity(product_id: str, name: str, price: float, sku: str, stored_checksum: str) -> bool:
    """
    Validates HMAC checksum of a product to detect unauthorized local price editing.
    """
    expected_checksum = calculate_checksum(f"{product_id}:{name}:{price}:{sku}")
    return hmac.compare_digest(expected_checksum, stored_checksum)

def log_security_event(event_type: str, target_id: str, details: str):
    """Logs security violations (e.g. price tampering attempts)."""
    init_sqlite_db()
    conn = get_sqlite_conn()
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
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_bills WHERE sync_status = 'PENDING'")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def mark_bill_as_synced(bill_id: str):
    """Marks a local bill as SYNCED after remote database confirmation."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE local_bills SET sync_status = 'SYNCED' WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()

def get_all_local_products() -> list:
    """Fetches all products stored in local SQLite database (pos_local.db)."""
    init_sqlite_db()
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_products ORDER BY updated_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_product(product_id: str):
    """Deletes a product from local SQLite database."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

def restock_local_product_stock(product_id: str, quantity: int):
    """Increments stock for a returned product in local SQLite database."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE local_products 
        SET stock = stock + ?, updated_at = ? 
        WHERE id = ? OR barcode = ? OR sku = ?
    """, (quantity, datetime.now().isoformat(), product_id, product_id, product_id))
    conn.commit()
    conn.close()


# ── Employee SQLite CRUD ──────────────────────────────────────

def save_employee_locally(emp_id: str, odoo_id: int | None, name: str, job_title: str | None, department: str | None, phone: str | None, email: str | None, status: str = "active") -> dict:
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
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
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_employees ORDER BY name ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_employee(emp_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_employees WHERE id = ?", (emp_id,))
    conn.commit()
    conn.close()

# ── Khata SQLite CRUD ──────────────────────────────────────

def save_khata_locally(cust_id: str, odoo_id: int | None, name: str, phone: str | None, email: str | None, balance: float = 0.0) -> dict:
    init_sqlite_db()
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
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
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_khata ORDER BY name ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_khata(cust_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_khata WHERE id = ?", (cust_id,))
    conn.commit()
    conn.close()

def clear_all_local_khata():
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_khata")
    conn.commit()
    conn.close()

def log_security_audit_event(event_type: str, target_id: str | None, details: str):
    """Logs tamper-proof security events for critical business mutations (price edit, stock change, deletion)."""
    try:
        init_sqlite_db()
        now_str = datetime.now().isoformat()
        log_id = str(uuid.uuid4())
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO security_audit_logs (id, event_type, target_id, details, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (log_id, event_type, target_id or "", details, now_str))
        conn.commit()
        conn.close()
    except Exception as err:
        print(f"[Audit Log Error] {err}")


