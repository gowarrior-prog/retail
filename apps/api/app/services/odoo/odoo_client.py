import os
import json
import urllib.request
import urllib.error
import socket

ODOO_URL = os.getenv("ODOO_URL", "http://192.168.100.2:8069")
ODOO_DB = os.getenv("ODOO_DB", "BilalClothHouse")
ODOO_USER = os.getenv("ODOO_USER", "bchnarowal@gmail.com")
ODOO_PASS = os.getenv("ODOO_PASS", "bilas58a")

def set_odoo_config(url: str = None, db: str = None, user: str = None, password: str = None):
    global ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASS
    if url:
        ODOO_URL = url.rstrip("/")
        os.environ["ODOO_URL"] = ODOO_URL
    if db:
        ODOO_DB = db.strip()
        os.environ["ODOO_DB"] = ODOO_DB
    if user:
        ODOO_USER = user.strip()
        os.environ["ODOO_USER"] = ODOO_USER
    if password:
        ODOO_PASS = password.strip()
        os.environ["ODOO_PASS"] = ODOO_PASS

def get_odoo_config():
    return {
        "url": ODOO_URL,
        "db": ODOO_DB,
        "user": ODOO_USER,
    }

def json_rpc(url: str, service: str, method: str, args: list, timeout: int = 5):
    data = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {"service": service, "method": method, "args": args},
        "id": 1
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_odoo_connection(url: str = None, db: str = None, user: str = None, password: str = None, timeout: int = 4) -> dict:
    target_url = (url or ODOO_URL).rstrip("/")
    target_db = (db or ODOO_DB).strip()
    target_user = (user or ODOO_USER).strip()
    target_pass = (password or ODOO_PASS).strip()

    # 1. Quick TCP socket ping
    try:
        from urllib.parse import urlparse
        parsed = urlparse(target_url)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 8069
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.close()
    except Exception as tcp_err:
        # Check candidate fallback URLs (localhost, 127.0.0.1, 192.168.100.2)
        candidates = ["http://localhost:8069", "http://127.0.0.1:8069", "http://192.168.100.2:8069"]
        found_candidate = None
        for cand in candidates:
            if cand != target_url:
                try:
                    c_parsed = urlparse(cand)
                    c_sock = socket.create_connection((c_parsed.hostname, c_parsed.port or 8069), timeout=1)
                    c_sock.close()
                    found_candidate = cand
                    break
                except Exception:
                    pass

        hint = f" (Discovered Odoo responding at {found_candidate}! Click to use it.)" if found_candidate else ""
        return {
            "status": "error",
            "connected": False,
            "message": f"Network error: Unable to reach {target_url} (Port {port} not responding).{hint}",
            "suggested_url": found_candidate,
            "error_detail": str(tcp_err)
        }

    # 2. Authenticate with Odoo JSON-RPC
    try:
        rpc_url = f"{target_url}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [target_db, target_user, target_pass, {}], timeout=timeout)
        uid = auth_res.get("result") if isinstance(auth_res, dict) else None
        if not uid:
            err_msg = auth_res.get("error", {}).get("message", "Invalid database name, username, or password.") if isinstance(auth_res, dict) else "Authentication rejected."
            return {
                "status": "error",
                "connected": True,
                "authenticated": False,
                "message": f"Connected to {target_url}, but login failed: {err_msg}",
                "target_url": target_url
            }

        # 3. Fetch version / info
        version_res = json_rpc(rpc_url, "common", "version", [], timeout=timeout)
        server_version = version_res.get("result", {}).get("server_version", "Odoo ERP") if isinstance(version_res, dict) else "Odoo ERP"

        # Update active config if test succeeded
        set_odoo_config(target_url, target_db, target_user, target_pass)

        return {
            "status": "success",
            "connected": True,
            "authenticated": True,
            "uid": uid,
            "server_version": server_version,
            "message": f"Successfully connected to Odoo {server_version} at {target_url} (UID: {uid})!",
            "target_url": target_url
        }
    except Exception as rpc_err:
        return {
            "status": "error",
            "connected": True,
            "authenticated": False,
            "message": f"RPC Error on {target_url}: {str(rpc_err)}",
            "target_url": target_url
        }

async def fetch_odoo_company_settings() -> dict:
    """Fetches Company Name, Phone, Address, Currency from Odoo res.company."""
    fallback_settings = {
        "company_name": "Bilal Cloth and Silk Center",
        "phone": "0301-0606643",
        "email": "bchnarowal@gmail.com",
        "address": "Main Bazar Railway Road, Narowal.",
        "currency": "PKR",
        "currency_symbol": "Rs."
    }
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        uid = auth_res.get("result") if isinstance(auth_res, dict) else None
        if not uid:
            return fallback_settings

        companies_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "res.company", "search_read", [[]],
            {"fields": ["id", "name", "email", "phone", "street", "city", "currency_id"]}
        ], timeout=5)
        companies = companies_res.get("result", []) if isinstance(companies_res, dict) else []

        if companies:
            c = companies[0]
            curr = c.get("currency_id")
            currency_name = curr[1] if isinstance(curr, (list, tuple)) and len(curr) > 1 else "PKR"
            return {
                "company_name": c.get("name") or fallback_settings["company_name"],
                "phone": c.get("phone") or fallback_settings["phone"],
                "email": c.get("email") or fallback_settings["email"],
                "address": c.get("street") or fallback_settings["address"],
                "currency": currency_name,
                "currency_symbol": "Rs."
            }
    except Exception as e:
        print(f"Notice: Odoo company settings error ({e}). Using default.")
    
    return fallback_settings
