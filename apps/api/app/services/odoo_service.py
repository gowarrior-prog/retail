import os
import uuid
import json
import socket
import urllib.request
import urllib.error
from sqlalchemy.future import select
from app.core.database import SessionDb1, SessionDb2, SessionDb3
from app.models.db1_catalog import ProductModel
from app.models.db2_operations import EmployeeModel
from app.models.db3_finance import CustomerKhataModel, ShopPurchaseModel

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
        print(f"Notice: Could not fetch Odoo company settings ({e}). Using local default settings.")
    
    return fallback_settings

async def sync_all_odoo_products(limit: int = None) -> dict:
    """
    Connects to Odoo ERP, fetches product.template items & company settings,
    calculates profit margin (price - cost_price), and upserts safely into DB1 Catalog
    without unique constraint violations or hanging timeouts.
    """
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {
                "status": "offline",
                "message": f"Odoo ERP authentication failed at {ODOO_URL}. Using local database catalog.",
                "total_fetched": 0,
                "new_imported": 0,
                "updated": 0
            }

        uid = auth_res.get("result")
        company_info = await fetch_odoo_company_settings()

        prods = []
        offset = 0
        batch_fetch_limit = 500
        while True:
            fetch_res = None
            try:
                fetch_res = json_rpc(rpc_url, "object", "execute_kw", [
                    ODOO_DB, uid, ODOO_PASS, "product.template", "search_read", [[]],
                    {
                        "fields": ["id", "name", "list_price", "standard_price", "qty_available", "default_code", "categ_id", "description_sale"],
                        "offset": offset,
                        "limit": batch_fetch_limit
                    }
                ], timeout=45)
            except Exception as b_err:
                print(f"Notice: Odoo full search_read notice at offset {offset}: {b_err}. Retrying without qty_available...")
                try:
                    fetch_res = json_rpc(rpc_url, "object", "execute_kw", [
                        ODOO_DB, uid, ODOO_PASS, "product.template", "search_read", [[]],
                        {
                            "fields": ["id", "name", "list_price", "standard_price", "default_code", "categ_id", "description_sale"],
                            "offset": offset,
                            "limit": batch_fetch_limit
                        }
                    ], timeout=30)
                except Exception as b_err2:
                    print(f"Error fetching Odoo batch at offset {offset}: {b_err2}")
                    break

            batch_items = fetch_res.get("result", []) if isinstance(fetch_res, dict) and fetch_res.get("result") else []
            if not batch_items:
                break
            prods.extend(batch_items)
            offset += len(batch_items)
            print(f"Odoo sync: Fetched {len(prods)} / 7979 products...")
            
            if limit and limit > 0 and len(prods) >= limit:
                prods = prods[:limit]
                break

        synced_count = 0
        updated_count = 0

        async with SessionDb1() as db:
            # Pre-fetch all existing DB products for fast in-memory unique SKU checking
            res_all = await db.execute(select(ProductModel))
            db_products = res_all.scalars().all()

            # Maps for instant lookup
            by_odoo_id = {p.odoo_id: p for p in db_products if p.odoo_id is not None}
            by_sku = {p.sku: p for p in db_products if p.sku}

            batch_size = 100
            for i, p in enumerate(prods):
                odoo_id = p.get("id")
                if not odoo_id:
                    continue

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
                base_sku = str(code).strip() if code and code is not False else f"ODOO-{odoo_id}"

                # Determine target product to update or create
                existing_product = by_odoo_id.get(odoo_id) or by_sku.get(base_sku)

                # Ensure SKU uniqueness
                final_sku = base_sku
                sku_owner = by_sku.get(final_sku)

                # If base_sku is already owned by a DIFFERENT database record, disambiguate it!
                if sku_owner and (existing_product is None or sku_owner.id != existing_product.id):
                    final_sku = f"{base_sku}-{odoo_id}"

                if existing_product:
                    existing_product.odoo_id = odoo_id
                    existing_product.name = name
                    existing_product.price = price
                    existing_product.cost_price = cost_price
                    existing_product.profit_margin = profit_margin
                    existing_product.stock = stock
                    existing_product.category = category_name
                    existing_product.sku = final_sku
                    existing_product.description = description
                    by_sku[final_sku] = existing_product
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
                        sku=final_sku,
                        category=category_name,
                        description=description
                    )
                    db.add(new_product)
                    by_odoo_id[odoo_id] = new_product
                    by_sku[final_sku] = new_product
                    synced_count += 1

                if (i + 1) % batch_size == 0:
                    await db.commit()

            await db.commit()

            # Save local hard disk JSON backup of all catalog products for instant local access & offline protection
            try:
                data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
                os.makedirs(data_dir, exist_ok=True)
                backup_path = os.path.join(data_dir, "local_catalog_backup.json")
                
                res_all_saved = await db.execute(select(ProductModel))
                all_saved_prods = res_all_saved.scalars().all()
                backup_list = []
                for p in all_saved_prods:
                    backup_list.append({
                        "id": p.id,
                        "name": p.name,
                        "description": p.description,
                        "price": p.price,
                        "cost_price": p.cost_price,
                        "profit_margin": p.profit_margin,
                        "stock": p.stock,
                        "sku": p.sku,
                        "barcode": p.barcode,
                        "category": p.category,
                        "image_url": p.image_url,
                        "odoo_id": p.odoo_id,
                        "created_at": str(p.created_at) if p.created_at else None,
                        "updated_at": str(p.updated_at) if p.updated_at else None
                    })
                with open(backup_path, "w", encoding="utf-8") as f:
                    json.dump(backup_list, f, indent=2, ensure_ascii=False)
                print(f"Local hard drive catalog backup updated at {backup_path} ({len(backup_list)} items).")
            except Exception as backup_err:
                print(f"Notice: Hard drive backup save exception ({backup_err}).")

        return {
            "status": "success",
            "message": f"Successfully synced {len(prods)} products from Odoo ERP & backed up to local hard drive!",
            "company_settings": company_info,
            "total_fetched": len(prods),
            "new_imported": synced_count,
            "updated": updated_count
        }

    except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionRefusedError) as net_err:
        return {
            "status": "offline",
            "message": f"Odoo ERP server is unreachable ({str(net_err)}). Using local database catalog.",
            "total_fetched": 0,
            "new_imported": 0,
            "updated": 0
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Odoo Sync notice: {str(e)}"
        }

async def sync_odoo_employees() -> dict:
    """Syncs ONLY staff and employee records from Odoo (hr.employee / res.partner) into DB2 Operations."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        emp_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "hr.employee", "search_read", [[]],
            {"fields": ["id", "name", "work_phone", "mobile_phone", "job_title", "identification_id"], "limit": 200}
        ], timeout=10)
        
        employees_data = emp_res.get("result", []) if isinstance(emp_res, dict) and emp_res.get("result") is not None else []
        
        synced_count = 0
        async with SessionDb2() as db2:
            res_all = await db2.execute(select(EmployeeModel))
            existing_emps = {e.phone: e for e in res_all.scalars().all() if e.phone}

            for emp in employees_data:
                name = str(emp.get("name") or "Staff Member")
                raw_phone = emp.get("mobile_phone") or emp.get("work_phone")
                phone = str(raw_phone).strip() if raw_phone and str(raw_phone).strip() != "False" else ""
                job = str(emp.get("job_title") or "SALES_EXECUTIVE")
                if job == "False":
                    job = "SALES_EXECUTIVE"
                cnic_raw = emp.get("identification_id")
                cnic = str(cnic_raw).strip() if cnic_raw and str(cnic_raw).strip() != "False" else None

                # Use unique phone key to prevent UNIQUE constraint violations
                db_phone = phone if phone else f"EMP-{emp.get('id')}"
                existing = existing_emps.get(db_phone)
                if existing:
                    existing.name = name
                    existing.role = job
                    if cnic:
                        existing.cnic = cnic
                else:
                    new_emp = EmployeeModel(
                        id=str(uuid.uuid4()),
                        name=name,
                        phone=db_phone,
                        cnic=cnic,
                        role=job,
                        base_salary=35000.0
                    )
                    db2.add(new_emp)
                    existing_emps[db_phone] = new_emp
                synced_count += 1
            await db2.commit()

        return {"status": "success", "message": f"Successfully synced {synced_count} employees from Odoo into DB2 Operations!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Employee Sync notice: {str(e)}"}

async def sync_odoo_khata() -> dict:
    """Syncs ONLY Khata/Customer receivables from Odoo (res.partner) into DB3 Finance."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        partners_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "res.partner", "search_read", [[["customer_rank", ">", 0]]],
            {"fields": ["id", "name", "phone", "mobile", "credit", "debit", "total_due"], "limit": 500}
        ], timeout=15)

        partners = partners_res.get("result", []) if isinstance(partners_res, dict) and partners_res.get("result") is not None else []
        
        if not partners:
            partners_res = json_rpc(rpc_url, "object", "execute_kw", [
                ODOO_DB, uid, ODOO_PASS, "res.partner", "search_read", [[]],
                {"fields": ["id", "name", "phone", "mobile", "credit", "debit", "total_due"], "limit": 500}
            ], timeout=15)
            partners = partners_res.get("result", []) if isinstance(partners_res, dict) and partners_res.get("result") is not None else []

        synced_count = 0
        async with SessionDb3() as db3:
            res_all = await db3.execute(select(CustomerKhataModel))
            existing_khatas = {k.phone: k for k in res_all.scalars().all() if k.phone}

            for p in partners:
                name = str(p.get("name") or "Khata Customer")
                raw_phone = p.get("mobile") or p.get("phone")
                phone = str(raw_phone).strip() if raw_phone and str(raw_phone).strip() != "False" else ""
                balance = float(p.get("credit") or p.get("total_due") or p.get("debit") or 0.0)

                # Use unique key for DB phone field to prevent UNIQUE constraint violations on empty phones
                db_phone = phone if phone else f"CUST-{p.get('id')}"
                existing = existing_khatas.get(db_phone)
                if existing:
                    existing.customer_name = name
                    existing.total_balance = balance
                else:
                    new_khata = CustomerKhataModel(
                        id=str(uuid.uuid4()),
                        customer_name=name,
                        phone=db_phone,
                        total_balance=balance
                    )
                    db3.add(new_khata)
                    existing_khatas[db_phone] = new_khata
                synced_count += 1
            await db3.commit()

        return {"status": "success", "message": f"Successfully synced {synced_count} Khata customer records from Odoo into DB3 Finance!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Khata Sync notice: {str(e)}"}

async def sync_odoo_purchases() -> dict:
    """Syncs ONLY Purchase orders and Vendor bills from Odoo (purchase.order / account.move) into DB3 Finance."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": "Odoo authentication failed.", "synced": 0}
        uid = auth_res.get("result")

        po_res = json_rpc(rpc_url, "object", "execute_kw", [
            ODOO_DB, uid, ODOO_PASS, "purchase.order", "search_read", [[]],
            {"fields": ["id", "name", "partner_id", "amount_total", "state", "date_order"], "limit": 200}
        ], timeout=15)

        orders = po_res.get("result", []) if isinstance(po_res, dict) and po_res.get("result") is not None else []

        synced_count = 0
        async with SessionDb3() as db3:
            for po in orders:
                supplier = po.get("partner_id")
                supplier_name = supplier[1] if isinstance(supplier, (list, tuple)) and len(supplier) > 1 else "Odoo Vendor"
                item_name = str(po.get("name") or "Fabric Stock Purchase")
                total_cost = float(po.get("amount_total") or 0.0)
                paid = total_cost if po.get("state") == "purchase" else 0.0
                remaining = max(0.0, total_cost - paid)

                new_purchase = ShopPurchaseModel(
                    id=str(uuid.uuid4()),
                    supplier_name=supplier_name,
                    item_name=item_name,
                    quantity=1,
                    total_cost=total_cost,
                    paid_amount=paid,
                    remaining=remaining,
                    notes=f"Synced from Odoo PO #{po.get('id')}"
                )
                db3.add(new_purchase)
                synced_count += 1
            await db3.commit()

        return {"status": "success", "message": f"Successfully synced {synced_count} Purchase orders from Odoo into DB3 Finance!", "synced": synced_count}
    except Exception as e:
        return {"status": "error", "message": f"Odoo Purchase Sync notice: {str(e)}"}
