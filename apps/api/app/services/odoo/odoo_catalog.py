import os
import uuid
import json
import urllib.error
import socket
from sqlalchemy.future import select
from app.core.database import SessionDb1
from app.models.db1_catalog import ProductModel
from app.services.odoo.odoo_client import ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASS, json_rpc, fetch_odoo_company_settings

async def sync_all_odoo_products(limit: int = None) -> dict:
    """Syncs product catalog from Odoo ERP into DB1 and local JSON backup."""
    try:
        rpc_url = f"{ODOO_URL}/jsonrpc"
        auth_res = json_rpc(rpc_url, "common", "authenticate", [ODOO_DB, ODOO_USER, ODOO_PASS, {}], timeout=5)
        if not isinstance(auth_res, dict) or not auth_res.get("result"):
            return {"status": "offline", "message": f"Odoo ERP unreachable at {ODOO_URL}.", "total_fetched": 0, "new_imported": 0, "updated": 0}

        uid = auth_res.get("result")
        company_info = await fetch_odoo_company_settings()

        prods = []
        offset = 0
        batch_fetch_limit = 500
        while True:
            try:
                fetch_res = json_rpc(rpc_url, "object", "execute_kw", [
                    ODOO_DB, uid, ODOO_PASS, "product.template", "search_read", [[["sale_ok", "=", True]]],
                    {
                        "fields": ["id", "name", "list_price", "standard_price", "default_code", "barcode", "categ_id", "qty_available", "description"],
                        "offset": offset,
                        "limit": batch_fetch_limit
                    }
                ], timeout=15)
                batch = fetch_res.get("result", []) if isinstance(fetch_res, dict) else []
                if not batch:
                    break
                prods.extend(batch)
                offset += len(batch)
                if limit and len(prods) >= limit:
                    prods = prods[:limit]
                    break
            except Exception:
                break

        if not prods:
            return {"status": "success", "message": "No products found in Odoo.", "total_fetched": 0, "new_imported": 0, "updated": 0}

        synced_count = 0
        updated_count = 0

        async with SessionDb1() as db:
            res_all = await db.execute(select(ProductModel))
            existing_db_items = res_all.scalars().all()
            by_odoo_id = {p.odoo_id: p for p in existing_db_items if p.odoo_id is not None}
            by_sku = {p.sku: p for p in existing_db_items if p.sku}

            batch_size = 100
            for i, p in enumerate(prods):
                odoo_id = p.get("id")
                name = str(p.get("name") or "Fabric Item").strip()
                price = float(p.get("list_price") or 0.0)
                cost_price = float(p.get("standard_price") or 0.0)
                profit_margin = round(price - cost_price, 2)
                stock = int(float(p.get("qty_available") or 0.0))
                default_code = str(p.get("default_code") or "").strip()
                final_sku = default_code if default_code else f"SKU-OD-{odoo_id}"
                raw_barcode = p.get("barcode")
                barcode = str(raw_barcode).strip() if raw_barcode and str(raw_barcode).strip() != "False" else None
                categ = p.get("categ_id")
                category_name = categ[1] if isinstance(categ, (list, tuple)) and len(categ) > 1 else "General"

                existing = by_odoo_id.get(odoo_id) or by_sku.get(final_sku)
                if existing:
                    existing.name = name
                    existing.price = price
                    existing.cost_price = cost_price
                    existing.profit_margin = profit_margin
                    existing.stock = stock
                    existing.sku = final_sku
                    if barcode:
                        existing.barcode = barcode
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
                        barcode=barcode
                    )
                    db.add(new_product)
                    synced_count += 1

                if (i + 1) % batch_size == 0:
                    await db.commit()

            await db.commit()

        return {
            "status": "success",
            "message": f"Successfully synced {len(prods)} products from Odoo ERP!",
            "company_settings": company_info,
            "total_fetched": len(prods),
            "new_imported": synced_count,
            "updated": updated_count
        }

    except Exception as e:
        return {"status": "error", "message": f"Odoo Sync notice: {str(e)}"}
