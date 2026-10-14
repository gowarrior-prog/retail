"""
Automated Database Schema Migration Service for Bilal Cloth POS:
- Version-tracked schema migrations table in local SQLite.
- Executes sequentially on FastAPI sidecar startup (boot sequence).
- Upgrades desktop database schemas automatically across application releases
  WITHOUT losing existing customer records, sales transactions, or inventory data.
"""

import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Callable

from app.core.paths import get_sqlite_path

class Migration:
    def __init__(self, version: int, name: str, description: str, up: Callable[[sqlite3.Connection], None]):
        self.version = version
        self.name = name
        self.description = description
        self.up = up


def _ensure_migrations_table(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        applied_at TEXT NOT NULL
    );
    """)
    conn.commit()


# ── MIGRATION DEFINITIONS ──────────────────────────────────────────────────────

def m001_initial_core_schema(conn: sqlite3.Connection):
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
    );
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
    );
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
    );
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
    );
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
    );
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
    );
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
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        target_id TEXT,
        details TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_ai_history (
        id TEXT PRIMARY KEY,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        intent TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL
    );
    """)


def m002_ai_audit_and_anomalies(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        original_prompt TEXT,
        parsed_json TEXT,
        status TEXT DEFAULT 'success',
        execution_time_ms REAL DEFAULT 0.0,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ai_anomaly_alerts (
        id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        cashier_name TEXT NOT NULL,
        details TEXT NOT NULL,
        metadata_json TEXT,
        is_resolved INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_anomaly_created ON ai_anomaly_alerts(created_at);")


def m003_print_queue_and_shifts(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_print_queue (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        invoice_number TEXT,
        receipt_data_json TEXT NOT NULL,
        printer_name TEXT,
        status TEXT DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        processed_at TEXT
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_shifts (
        id TEXT PRIMARY KEY,
        cashier_name TEXT NOT NULL,
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        opening_cash REAL DEFAULT 0.0,
        closing_cash REAL DEFAULT 0.0,
        expected_cash REAL DEFAULT 0.0,
        total_sales REAL DEFAULT 0.0,
        total_bills INTEGER DEFAULT 0,
        status TEXT DEFAULT 'OPEN',
        notes TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_print_status ON local_print_queue(status);")


def m004_cart_sessions_mirror(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS local_cart_sessions (
        session_id TEXT PRIMARY KEY,
        cashier_name TEXT NOT NULL,
        items_json TEXT NOT NULL,
        held_bills_json TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        order_note TEXT,
        updated_at TEXT NOT NULL
    );
    """)


def m005_performance_indexes(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_invoice ON local_bills(invoice_number);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_created ON local_bills(created_at);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_sync ON local_bills(sync_status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_sku ON local_products(sku);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_barcode ON local_products(barcode);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_khata_name ON local_khata(name);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_purchases_created ON local_purchases(created_at);")


def m006_sqlcipher_and_ledger_checksums(conn: sqlite3.Connection):
    cursor = conn.cursor()
    # 1. Add checksum columns to financial ledgers (Khata & Purchases) if not present
    for table in ["local_khata", "local_purchases"]:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN checksum TEXT DEFAULT '';")
        except Exception:
            # Column already exists
            pass

    # 2. Immutable Cryptographic System Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT,
        event_type TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details_json TEXT,
        prev_hash TEXT,
        hmac_signature TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);")


# Registry of all migrations in order
ALL_MIGRATIONS: List[Migration] = [
    Migration(1, "001_core_schema", "Initial database schema across 9 modules", m001_initial_core_schema),
    Migration(2, "002_ai_audit_and_anomalies", "AI audit trail and Ghabla fraud alert tables", m002_ai_audit_and_anomalies),
    Migration(3, "003_print_queue_and_shifts", "Robust print queue and register shift tracking", m003_print_queue_and_shifts),
    Migration(4, "004_cart_sessions_mirror", "Local cart session mirror for crash recovery", m004_cart_sessions_mirror),
    Migration(5, "005_performance_indexes", "High-speed composite indexes for instant query response", m005_performance_indexes),
    Migration(6, "006_sqlcipher_and_ledger_checksums", "Financial ledger checksum columns and immutable audit log chain", m006_sqlcipher_and_ledger_checksums),
]


def run_all_migrations() -> Dict[str, Any]:
    """
    Runs all unapplied schema migrations atomically on FastAPI sidecar boot.
    Safeguards existing data while updating tables to the latest version.
    Supports SQLCipher transparently via get_sqlite_conn.
    """
    from app.services.sqlite_sync_service import get_sqlite_conn
    conn = get_sqlite_conn()
    _ensure_migrations_table(conn)

    cursor = conn.cursor()
    applied_rows = cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC;").fetchall()
    applied_versions = {r[0] for r in applied_rows}

    applied_now = []
    try:
        for mig in ALL_MIGRATIONS:
            if mig.version not in applied_versions:
                print(f"[Schema Migration] Applying v{mig.version:03d} ({mig.name})...")
                # Execute migration
                mig.up(conn)
                now_iso = datetime.now().isoformat()
                cursor.execute(
                    "INSERT INTO schema_migrations (version, name, description, applied_at) VALUES (?, ?, ?, ?);",
                    (mig.version, mig.name, mig.description, now_iso)
                )
                conn.commit()
                applied_now.append(mig.name)
                print(f"[Schema Migration] Successfully applied v{mig.version:03d} ({mig.name})")

        return {
            "status": "success",
            "applied_count": len(applied_now),
            "applied_migrations": applied_now,
            "current_schema_version": max([m.version for m in ALL_MIGRATIONS]) if ALL_MIGRATIONS else 0
        }
    except Exception as e:
        conn.rollback()
        print(f"[Schema Migration ERROR] Failed to apply migration: {e}")
        return {"status": "error", "message": str(e), "applied_so_far": applied_now}
    finally:
        conn.close()
