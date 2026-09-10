import os
import uuid
import json
import urllib.request
from sqlalchemy.future import select
from database import SessionDb1
from models import ProductModel

ODOO_URL = os.getenv("ODOO_URL", "http://192.168.100.2:8069")
ODOO_DB = os.getenv("ODOO_DB", "BilalClothHouse")
ODOO_USER = os.getenv("ODOO_USER", "bchnarowal@gmail.com")
ODOO_PASS = os.getenv("ODOO_PASS", "bilas58a")

def json_rpc(url, service, method, args):
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
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

async def fetch_odoo_company_settings() -> dict:
    """Fetches Company Name, Phone, Address, Currency from Odoo res.company."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        uid = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}]).get("result")
        if not uid:
            return {}

        companies = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "res.company", "search_read", [[]],
            {"fields": ["id", "name", "email", "phone", "street", "city", "currency_id"]}
        ]).get("result", [])

        if companies:
            c = companies[0]
            curr = c.get("currency_id")
            currency_name = curr[1] if isinstance(curr, (list, tuple)) and len(curr) > 1 else "PKR"
            return {
                "company_name": c.get("name") or "Bilal Cloth and Silk Center",
                "phone": c.get("phone") or "0301-0606643",
                "email": c.get("email") or "bchnarowal@gmail.com",
                "address": c.get("street") or "Main Bazar Railway Road, Narowal.",
                "currency": currency_name,
                "currency_symbol": "Rs."
            }
    except Exception as e:
        print(f"Error fetching Odoo company settings: {e}")
    
    return {
        "company_name": "Bilal Cloth and Silk Center",
        "phone": "0301-0606643",
        "email": "bchnarowal@gmail.com",
        "address": "Main Bazar Railway Road, Narowal.",
        "currency": "PKR",
        "currency_symbol": "Rs."
    }

async def sync_all_odoo_products(limit: int = 1000) -> dict:
    """
    Connects to Odoo ERP, fetches product.template items & company settings,
    calculates profit margin (price - cost_price), and upserts into DB1 Catalog.
    """
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        uid = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}]).get("result")
        
        if not uid:
            return {"status": "error", "message": "Odoo authentication failed."}

        company_info = await fetch_odoo_company_settings()

        prods = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "product.template", "search_read", [[]],
            {
                "fields": ["id", "name", "list_price", "standard_price", "qty_available", "default_code", "categ_id", "description_sale"],
                "limit": limit
            }
        ]).get("result", [])

        synced_count = 0
        updated_count = 0

        async with SessionDb1() as db:
            for p in prods:
                odoo_id = p.get("id")
                name = str(p.get("name")) if p.get("name") and p.get("name") is not False else "Unnamed Product"
                price = float(p.get("list_price") or 0.0)
                cost_price = float(p.get("standard_price") or 0.0)
                profit_margin = round(price - cost_price, 2)
                stock = int(p.get("qty_available") or 0)
                
                desc = p.get("description_sale")
                description = str(desc) if desc and desc is not False else None

                categ_data = p.get("categ_id")
                category_name = "General"
                if isinstance(categ_data, (list, tuple)) and len(categ_data) > 1 and categ_data[1]:
                    category_name = str(categ_data[1])

                code = p.get("default_code")
                sku = str(code) if code and code is not False else f"ODOO-{odoo_id}"

                res = await db.execute(select(ProductModel).filter(ProductModel.odoo_id == odoo_id))
                existing_product = res.scalars().first()

                if existing_product:
                    existing_product.name = name
                    existing_product.price = price
                    existing_product.cost_price = cost_price
                    existing_product.profit_margin = profit_margin
                    existing_product.stock = stock
                    existing_product.category = category_name
                    existing_product.sku = sku
                    existing_product.description = description
                    updated_count += 1
                else:
                    new_product = ProductModel(
                        id=str(uuid.uuid4()),
                        odoo_id=odoo_id,
                        name=name,
                        price=price,
                        cost_price=cost_price,
                        profit_margin=profit_margin,
                        stock=stock,
                        sku=sku,
                        category=category_name,
                        description=description
                    )
                    db.add(new_product)
                    synced_count += 1

            await db.commit()

        return {
            "status": "success",
            "message": f"Successfully synced from Odoo!",
            "company_settings": company_info,
            "total_fetched": len(prods),
            "new_imported": synced_count,
            "updated": updated_count
        }

    except Exception as e:
        return {"status": "error", "message": f"Odoo Sync failed: {str(e)}"}
