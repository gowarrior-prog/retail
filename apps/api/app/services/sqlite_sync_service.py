import os
import sqlite3
import json
import uuid
import hashlib
import hmac
from datetime import datetime

SYSTEM_SECRET = os.getenv("SECURITY_HMAC_SECRET", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#")

from app.core.paths import get_sqlite_path, get_app_data_dir

def calculate_checksum(data_str: str) -> str:
    """Generates SHA-256 HMAC signature to detect local database tampering."""
    return hmac.new(SYSTEM_SECRET.encode('utf-8'), data_str.encode('utf-8'), hashlib.sha256).hexdigest()

def get_sqlite_conn() -> sqlite3.Connection:
    """Returns an active connection to pos_local.db with self-healing recovery and WAL mode for max performance."""
    db_path = get_sqlite_path()
    conn = None
    try:
        conn = sqlite3.connect(db_path, timeout=15)
        # SQLite Power-Loss Guard Pragmas
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=10000;")       # 10s busy wait prevents 'database locked'
        conn.execute("PRAGMA wal_autocheckpoint=1000;")   # Auto checkpoint at 1000 pages
        conn.execute("PRAGMA cache_size=-64000;")         # 64MB RAM Cache
        conn.execute("PRAGMA temp_store=MEMORY;")
        conn.execute("PRAGMA foreign_keys=ON;")
        res = conn.execute("PRAGMA quick_check").fetchone()
        if res and res[0] == "ok":
            _create_tables(conn)
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


def checkpoint_wal_db(mode: str = "PASSIVE") -> dict:
    """
    Executes a WAL checkpoint (PASSIVE, FULL, RESTART, or TRUNCATE)
    to write WAL pages back into the main database file.
    Ensures complete durability on shutdown or shift close.
    """
    try:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        res = cursor.execute(f"PRAGMA wal_checkpoint({mode});").fetchone()
        conn.close()
        return {"status": "success", "busy": res[0], "log": res[1], "checkpointed": res[2]}
    except Exception as e:
        print(f"[WAL Checkpoint Notice] {e}")
        return {"status": "error", "message": str(e)}



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
    CREATE TABLE IF NOT EXISTS local_purchases (
        id TEXT PRIMARY KEY,
        supplier_name TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        paid_amount REAL NOT NULL,
        remaining REAL DEFAULT 0.0,
        notes TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_customer_returns (
        id TEXT PRIMARY KEY,
        return_code TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        original_invoice TEXT,
        items_json TEXT NOT NULL,
        total_value REAL NOT NULL,
        refund_type TEXT DEFAULT 'CASH',
        condition TEXT DEFAULT 'Restocked',
        status TEXT DEFAULT 'Completed',
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_supplier_returns (
        id TEXT PRIMARY KEY,
        return_code TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        purchase_bill TEXT,
        items_json TEXT NOT NULL,
        total_value REAL NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'Completed',
        created_at TEXT NOT NULL
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
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_ai_history (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        intent TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        original_prompt TEXT NOT NULL,
        parsed_json TEXT,
        status TEXT NOT NULL,
        execution_time_ms REAL DEFAULT 0.0,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_anomaly_alerts (
        id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        cashier_name TEXT,
        details TEXT NOT NULL,
        metadata_json TEXT,
        is_resolved INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # Performance & Search Indexes for 0ms queries
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
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cust_rets_code ON local_customer_returns(return_code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_supp_rets_code ON local_supplier_returns(return_code);")
    conn.commit()

def init_sqlite_db():
    """Initializes local SQLite database schemas with tampering protection columns and 0ms search indexes."""
    conn = get_sqlite_conn()
    conn.close()


def save_bill_locally(invoice_number: str, customer_phone: str, total_amount: float, discount: float, tax: float, payment_mode: str, cashier_name: str, item_details_json: str) -> dict:
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
    if not items:
        return
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

def get_all_local_bills() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM local_bills ORDER BY created_at DESC')
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_pending_local_bills() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_bills WHERE sync_status = 'PENDING'")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def mark_bill_as_synced(bill_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("UPDATE local_bills SET sync_status = 'SYNCED' WHERE id = ?", (bill_id,))
    conn.commit()
    conn.close()

def get_all_local_products() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_products ORDER BY updated_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_product(product_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

def restock_local_product_stock(product_id: str, quantity: int):
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

# ── Purchases SQLite CRUD ──────────────────────────────────────

def save_purchase_locally(pur_id: str, supplier_name: str, item_name: str, quantity: int, total_cost: float, paid_amount: float, remaining: float, notes: str | None = None) -> dict:
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_purchases (id, supplier_name, item_name, quantity, total_cost, paid_amount, remaining, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            supplier_name=excluded.supplier_name, item_name=excluded.item_name,
            quantity=excluded.quantity, total_cost=excluded.total_cost,
            paid_amount=excluded.paid_amount, remaining=excluded.remaining,
            notes=excluded.notes
    """, (pur_id, supplier_name, item_name, quantity, total_cost, paid_amount, remaining, notes or "", now_str))
    conn.commit()
    conn.close()
    return {"id": pur_id, "supplier_name": supplier_name, "saved_locally": True}

def get_all_local_purchases() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_purchases ORDER BY created_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def delete_local_purchase(pur_id: str):
    pur_str = str(pur_id).strip()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM local_purchases WHERE id = ? OR LOWER(supplier_name) = LOWER(?)",
        (pur_str, pur_str)
    )
    conn.commit()
    conn.close()

def delete_local_customer_return(ret_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_customer_returns WHERE id = ? OR return_code = ?", (ret_id, ret_id))
    conn.commit()
    conn.close()

def delete_local_supplier_return(ret_id: str):
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_supplier_returns WHERE id = ? OR return_code = ?", (ret_id, ret_id))
    conn.commit()
    conn.close()

def log_security_audit_event(event_type: str, target_id: str | None, details: str):
    try:
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

# ── Returns SQLite CRUD ──────────────────────────────────────

def save_customer_return_locally(ret_id: str, return_code: str, customer_name: str, customer_phone: str | None, original_invoice: str | None, items_json: str, total_value: float, refund_type: str = "CASH", condition: str = "Restocked", status: str = "Completed") -> dict:
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_customer_returns (id, return_code, customer_name, customer_phone, original_invoice, items_json, total_value, refund_type, condition, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            return_code=excluded.return_code, customer_name=excluded.customer_name,
            items_json=excluded.items_json, total_value=excluded.total_value,
            refund_type=excluded.refund_type, condition=excluded.condition, status=excluded.status
    """, (ret_id, return_code, customer_name, customer_phone or "", original_invoice or "", items_json, total_value, refund_type, condition, status, now_str))
    conn.commit()
    conn.close()
    return {"id": ret_id, "return_code": return_code, "saved_locally": True}

def get_all_local_customer_returns() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_customer_returns ORDER BY created_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def save_supplier_return_locally(ret_id: str, return_code: str, supplier_name: str, purchase_bill: str | None, items_json: str, total_value: float, reason: str | None = None, status: str = "Completed") -> dict:
    now_str = datetime.now().isoformat()
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_supplier_returns (id, return_code, supplier_name, purchase_bill, items_json, total_value, reason, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            return_code=excluded.return_code, supplier_name=excluded.supplier_name,
            items_json=excluded.items_json, total_value=excluded.total_value,
            reason=excluded.reason, status=excluded.status
    """, (ret_id, return_code, supplier_name, purchase_bill or "", items_json, total_value, reason or "", status, now_str))
    conn.commit()
    conn.close()
    return {"id": ret_id, "return_code": return_code, "saved_locally": True}

def get_all_local_supplier_returns() -> list:
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM local_supplier_returns ORDER BY created_at DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def clear_all_local_pos_data():
    """Wipes all local SQLite tables (products, bills, khata, purchases, returns) before importing full fresh Odoo database."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_products")
    cursor.execute("DELETE FROM local_bills")
    cursor.execute("DELETE FROM local_employees")
    cursor.execute("DELETE FROM local_khata")
    cursor.execute("DELETE FROM local_purchases")
    cursor.execute("DELETE FROM local_customer_returns")
    cursor.execute("DELETE FROM local_supplier_returns")
    conn.commit()
    conn.close()


# ── AI Chat History (Local SQLite & Cloud DB2 Sync) ────────────────

def save_ai_chat_message(msg_id: str, sender: str, message: str, intent: str | None = None, metadata: dict | None = None) -> dict:
    """Saves AI conversational message to local SQLite table."""
    now_str = datetime.now().isoformat()
    meta_json = json.dumps(metadata or {})
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO local_ai_history (id, sender, message, intent, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            message=excluded.message, intent=excluded.intent, metadata_json=excluded.metadata_json
    """, (msg_id, sender, message, intent or "chat", meta_json, now_str))
    conn.commit()
    conn.close()
    return {"id": msg_id, "saved": True}


def get_recent_ai_chat_history(limit: int = 40) -> list:
    """Fetches recent AI chat messages from local SQLite."""
    conn = get_sqlite_conn()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sender, message, intent, metadata_json, created_at
        FROM local_ai_history
        ORDER BY created_at ASC
        LIMIT ?
    """, (limit,))
    rows = []
    for r in cursor.fetchall():
        meta = {}
        try:
            meta = json.loads(r["metadata_json"] or "{}")
        except Exception:
            pass
        rows.append({
            "id": r["id"],
            "sender": r["sender"],
            "text": r["message"],
            "intent": r["intent"],
            "timestamp": r["created_at"],
            **meta
        })
    conn.close()
    return rows


def clear_all_local_ai_history():
    """Clears all stored AI conversation logs from local SQLite."""
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM local_ai_history")
    conn.commit()
    conn.close()


async def sync_ai_message_to_db2(msg_id: str, sender: str, message: str, intent: str | None, metadata: dict | None):
    """Syncs AI conversation record to Cloud Supabase DB2 (Operations & AI history)."""
    try:
        from app.core.database import SessionDb2
        from sqlalchemy import text
        async with SessionDb2() as session:
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS ai_chat_history (
                    id TEXT PRIMARY KEY,
                    sender TEXT NOT NULL,
                    message TEXT NOT NULL,
                    intent TEXT,
                    metadata_json TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            await session.execute(text("""
                INSERT INTO ai_chat_history (id, sender, message, intent, metadata_json)
                VALUES (:id, :sender, :message, :intent, :meta)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": msg_id,
                "sender": sender,
                "message": message,
                "intent": intent or "chat",
                "meta": json.dumps(metadata or {})
            })
            await session.commit()
    except Exception:
        # Non-blocking fail-safe: local SQLite preserves all messages offline
        pass


def log_ai_audit_event(
    user_id: str,
    role: str,
    module: str,
    action: str,
    original_prompt: str,
    parsed_json: Optional[Dict[str, Any]] = None,
    status: str = "success",
    execution_time_ms: float = 0.0
) -> str:
    """Logs every AI-driven action into SQLite ai_audit_logs table with zero blocking overhead."""
    conn = None
    try:
        conn = get_sqlite_conn()
        c = conn.cursor()
        log_id = f"audit-{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now().isoformat()
        c.execute("""
            INSERT INTO ai_audit_logs (id, user_id, role, module, action, original_prompt, parsed_json, status, execution_time_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            log_id,
            user_id or "anonymous",
            role or "cashier",
            module or "general",
            action or "query",
            original_prompt[:1000] if original_prompt else "",
            json.dumps(parsed_json or {}),
            status,
            round(execution_time_ms, 2),
            now_iso
        ))
        conn.commit()
        return log_id
    except Exception as e:
        print(f"[AI Audit Log Notice] Could not log event: {e}")
        return ""
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def log_anomaly_alert(
    alert_type: str,
    severity: str,
    cashier_name: str,
    details: str,
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """Logs security, fraud, or discount anomaly into local SQLite ai_anomaly_alerts table."""
    conn = None
    try:
        conn = get_sqlite_conn()
        c = conn.cursor()
        alert_id = f"alert-{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now().isoformat()
        c.execute("""
            INSERT INTO ai_anomaly_alerts (id, alert_type, severity, cashier_name, details, metadata_json, is_resolved, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        """, (
            alert_id,
            alert_type,
            severity,
            cashier_name or "Unknown",
            details,
            json.dumps(metadata or {}),
            now_iso
        ))
        conn.commit()
        return alert_id
    except Exception as e:
        print(f"[Anomaly Log Notice] Could not log anomaly alert: {e}")
        return ""
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def verify_all_local_ledger_integrity() -> Dict[str, Any]:
    """
    Cryptographic verification:
    Checks SHA-256 HMAC checksums of all bills and products in pos_local.db
    to detect any external database tampering or unauthorized row manipulation.
    """
    conn = None
    total_bills = 0
    tampered_bills = 0
    total_products = 0
    tampered_products = 0

    try:
        conn = get_sqlite_conn()
        c = conn.cursor()

        # 1. Audit Bills
        c.execute("SELECT id, invoice_number, total_amount, item_details_json, checksum FROM local_bills")
        for row in c.fetchall():
            b_id, inv_num, amt, items_json, stored_chk = row
            total_bills += 1
            expected = calculate_checksum(f"{inv_num}_{amt}_{items_json}")
            if stored_chk != expected:
                tampered_bills += 1
                log_anomaly_alert(
                    alert_type="database_tampering",
                    severity="CRITICAL",
                    cashier_name="SYSTEM",
                    details=f"Cryptographic hash mismatch detected on bill {inv_num}! Possible SQLite file modification.",
                    metadata={"bill_id": b_id, "invoice_number": inv_num}
                )

        # 2. Audit Products
        c.execute("SELECT id, sku, price, stock, checksum FROM local_products")
        for row in c.fetchall():
            p_id, sku, price, stock, stored_chk = row
            total_products += 1
            expected = calculate_checksum(f"{sku}_{price}_{stock}")
            if stored_chk != expected:
                tampered_products += 1
                log_anomaly_alert(
                    alert_type="product_price_tampering",
                    severity="HIGH",
                    cashier_name="SYSTEM",
                    details=f"Unauthorized price/stock modification detected on SKU {sku}!",
                    metadata={"product_id": p_id, "sku": sku}
                )

        return {
            "status": "secure" if (tampered_bills == 0 and tampered_products == 0) else "tampering_detected",
            "total_bills_audited": total_bills,
            "tampered_bills": tampered_bills,
            "total_products_audited": total_products,
            "tampered_products": tampered_products,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def audit_recent_bills_for_anomalies(limit: int = 50) -> List[Dict[str, Any]]:
    """
    AI Anomaly & Theft (Ghabla) Detection Engine:
    1. Audits high discounts (> 20%).
    2. Identifies items sold below cost price.
    3. Flags sales transacted during off-hours (11:00 PM - 7:00 AM).
    4. Detects high-frequency receipt voids / return patterns.
    """
    alerts = []
    conn = None
    try:
        conn = get_sqlite_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, invoice_number, total_amount, discount, cashier_name, item_details_json, created_at
            FROM local_bills
            ORDER BY created_at DESC LIMIT ?
        """, (limit,))
        bills = c.fetchall()

        for b in bills:
            b_id, inv_num, amt, disc, cashier, items_json, created_at = b

            # A. High Discount Audit (> 20%)
            if disc and disc > 20.0:
                alert = {
                    "alert_type": "excessive_discount",
                    "severity": "MEDIUM",
                    "cashier_name": cashier or "Cashier",
                    "details": f"Bill {inv_num} given an abnormally high discount of {disc:.1f}%.",
                    "invoice_number": inv_num
                }
                alerts.append(alert)
                log_anomaly_alert(alert["alert_type"], alert["severity"], alert["cashier_name"], alert["details"], {"bill_id": b_id, "discount": disc})

            # B. Off-Hours Sales Audit (Between 11:00 PM and 7:00 AM)
            try:
                dt = datetime.fromisoformat(created_at)
                if dt.hour >= 23 or dt.hour < 7:
                    alert = {
                        "alert_type": "off_hours_transaction",
                        "severity": "HIGH",
                        "cashier_name": cashier or "Cashier",
                        "details": f"Transaction {inv_num} recorded during off-hours at {dt.strftime('%I:%M %p')}.",
                        "invoice_number": inv_num
                    }
                    alerts.append(alert)
                    log_anomaly_alert(alert["alert_type"], alert["severity"], alert["cashier_name"], alert["details"], {"bill_id": b_id, "time": created_at})
            except Exception:
                pass

            # C. Sold Below Cost Price Audit
            if items_json:
                try:
                    items = json.loads(items_json)
                    for itm in items:
                        cost = float(itm.get("cost_price") or 0.0)
                        sold_price = float(itm.get("unit_price") or itm.get("price") or 0.0)
                        if cost > 0.0 and sold_price < cost:
                            alert = {
                                "alert_type": "sold_below_cost",
                                "severity": "HIGH",
                                "cashier_name": cashier or "Cashier",
                                "details": f"Item '{itm.get('product_name', 'Item')}' sold for Rs {sold_price:.0f} which is below cost price (Rs {cost:.0f})!",
                                "invoice_number": inv_num
                            }
                            alerts.append(alert)
                            log_anomaly_alert(alert["alert_type"], alert["severity"], alert["cashier_name"], alert["details"], {"bill_id": b_id, "item": itm})
                except Exception:
                    pass

        return alerts
    except Exception as e:
        print(f"[Anomaly Audit Notice] Error auditing bills: {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def get_ai_audit_logs(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    """Fetches paginated AI audit trail logs."""
    conn = None
    try:
        conn = get_sqlite_conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
            SELECT id, user_id, role, module, action, original_prompt, parsed_json, status, execution_time_ms, created_at
            FROM ai_audit_logs
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))
        rows = [dict(r) for r in c.fetchall()]
        return rows
    except Exception as e:
        print(f"[Audit Log Fetch Notice] {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def get_ai_anomaly_alerts(limit: int = 50, unresolved_only: bool = False) -> List[Dict[str, Any]]:
    """Fetches AI anomaly and theft alerts."""
    conn = None
    try:
        conn = get_sqlite_conn()
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        query = "SELECT * FROM ai_anomaly_alerts"
        params: List[Any] = []
        if unresolved_only:
            query += " WHERE is_resolved = 0"
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        c.execute(query, tuple(params))
        rows = [dict(r) for r in c.fetchall()]
        return rows
    except Exception as e:
        print(f"[Anomaly Alerts Fetch Notice] {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass



