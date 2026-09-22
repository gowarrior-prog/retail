import os
import json
import urllib.request
import urllib.error

ODOO_URL = os.getenv("ODOO_URL", "http://192.168.100.2:8069")
ODOO_DB = os.getenv("ODOO_DB", "BilalClothHouse")
ODOO_USER = os.getenv("ODOO_USER", "bchnarowal@gmail.com")
ODOO_PASS = os.getenv("ODOO_PASS", "bilas58a")

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
