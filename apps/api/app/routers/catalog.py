import json
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db1
from app.models.db1_catalog import ProductModel
from app.schemas.product import ProductCreate, ProductResponse
from app.services.odoo_service import sync_all_odoo_products, fetch_odoo_company_settings
from app.services.storage_service import upload_product_image_with_fallback

router = APIRouter(tags=["Catalog & Products"])

import asyncio
from app.services.sqlite_sync_service import save_product_locally, get_all_local_products, delete_local_product, save_products_bulk_locally
from app.services.backup_service import backup_all_data_to_hard_drive

# In-memory RAM cache for instant sub-millisecond product list responses
_PRODUCT_CACHE = []
_LAST_CACHE_TIME = 0.0

@router.get("/products", response_model=list[ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db1)):
    global _PRODUCT_CACHE, _LAST_CACHE_TIME
    import time

    # Return cached products instantly if retrieved within last 10 seconds
    if _PRODUCT_CACHE and (time.time() - _LAST_CACHE_TIME < 10.0):
        return _PRODUCT_CACHE

    local_prods = get_all_local_products()
    local_map = {p["id"]: p for p in local_prods}

    if db is not None:
        try:
            result = await asyncio.wait_for(db.execute(select(ProductModel)), timeout=1.5)
            prods = result.scalars().all()
            if prods:
                db_items_to_sync = []
                for p in prods:
                    db_items_to_sync.append({
                        "id": p.id,
                        "odoo_id": getattr(p, 'odoo_id', None),
                        "name": p.name,
                        "price": p.price,
                        "cost_price": p.cost_price,
                        "sku": p.sku or p.id[:8],
                        "barcode": p.barcode,
                        "category": p.category or "General",
                        "stock": p.stock or 0
                    })
                    local_map[p.id] = {
                        "id": p.id,
                        "odoo_id": getattr(p, 'odoo_id', None),
                        "name": p.name,
                        "price": p.price,
                        "cost_price": p.cost_price,
                        "profit_margin": getattr(p, 'profit_margin', None),
                        "sku": p.sku or p.id[:8],
                        "barcode": p.barcode,
                        "category": p.category or "General",
                        "image_url": getattr(p, 'image_url', None),
                        "stock": p.stock or 0,
                        "created_at": p.created_at.isoformat() if getattr(p, 'created_at', None) else None,
                        "updated_at": p.updated_at.isoformat() if getattr(p, 'updated_at', None) else None,
                    }
                # Fast bulk save into SQLite in background/single transaction
                try:
                    save_products_bulk_locally(db_items_to_sync)
                except Exception as sq_err:
                    print(f"Notice: SQLite bulk save notice ({sq_err})")
        except Exception as db_err:
            print(f"Notice: DB1 query timeout/offline ({db_err}). Serving local SQLite products.")

    final_list = list(local_map.values())
    _PRODUCT_CACHE = final_list
    _LAST_CACHE_TIME = time.time()
    return final_list

@router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db1)):
    data = product.model_dump(exclude_none=False)
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    if data.get("price") and data.get("cost_price") and not data.get("profit_margin"):
        data["profit_margin"] = round(((data["price"] - data["cost_price"]) / data["price"]) * 100, 2)

    # 1. ALWAYS save into local SQLite database (pos_local.db) FIRST!
    try:
        save_product_locally(
            product_id=data["id"],
            odoo_id=data.get("odoo_id"),
            name=data["name"],
            price=data["price"],
            cost_price=data.get("cost_price"),
            sku=data.get("sku") or data["id"][:8],
            barcode=data.get("barcode"),
            category=data.get("category"),
            stock=data.get("stock")
        )
    except Exception as sq_err:
        print(f"Notice: SQLite product save error ({sq_err}).")

    # 2. Try DB1 PostgreSQL upsert if online
    if db is not None:
        try:
            existing = None
            if data.get("id"):
                res = await db.execute(select(ProductModel).filter(ProductModel.id == data["id"]))
                existing = res.scalars().first()
            if not existing and data.get("barcode"):
                res = await db.execute(select(ProductModel).filter(ProductModel.barcode == data["barcode"]))
                existing = res.scalars().first()

            if existing:
                for k, v in data.items():
                    if k != "id" and v is not None:
                        setattr(existing, k, v)
                db_product = existing
            else:
                db_product = ProductModel(**data)
                db.add(db_product)

            await db.commit()
            await db.refresh(db_product)

            try:
                await backup_all_data_to_hard_drive()
            except Exception:
                pass

            return db_product
        except Exception as e:
            print(f"Notice: Remote DB1 unreachable offline ({e}). Product saved in local SQLite database.")

    return data


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductCreate, db: AsyncSession = Depends(get_db1)):
    data = product_update.model_dump(exclude_none=True)
    # Always update local SQLite first
    try:
        save_product_locally(
            product_id=product_id,
            odoo_id=data.get("odoo_id"),
            name=data.get("name", "Updated Item"),
            price=data.get("price", 0.0),
            cost_price=data.get("cost_price"),
            sku=data.get("sku") or product_id[:8],
            barcode=data.get("barcode"),
            category=data.get("category"),
            stock=data.get("stock")
        )
    except Exception as sq_err:
        print(f"SQLite update product notice: {sq_err}")

    try:
        result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
        db_product = result.scalars().first()
        if db_product:
            for k, v in data.items():
                if v is not None:
                    setattr(db_product, k, v)

            if db_product.price and db_product.cost_price:
                db_product.profit_margin = ((db_product.price - db_product.cost_price) / db_product.price) * 100

            await db.commit()
            await db.refresh(db_product)
            try:
                await backup_all_data_to_hard_drive()
            except Exception:
                pass
            return db_product
        return data
    except Exception as e:
        print(f"DB1 unreachable during update ({e}). Saved locally to SQLite.")
        return data

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db1)):
    try:
        delete_local_product(product_id)
    except Exception:
        pass

    try:
        result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
        db_product = result.scalars().first()
        if db_product:
            await db.delete(db_product)
            await db.commit()
            try:
                await backup_all_data_to_hard_drive()
            except Exception:
                pass
            return {"message": "Product deleted from DB1 and SQLite successfully"}
        return {"message": "Product deleted from local SQLite"}
    except Exception as e:
        print(f"DB1 unreachable ({e}). Product deleted from local SQLite.")
        return {"message": "Product deleted from local SQLite (DB1 offline)"}

@router.post("/products/sync-pending")
async def sync_pending_products(db: AsyncSession = Depends(get_db1)):
    """Syncs SQLite local products to DB1 when connection is restored."""
    try:
        local_prods = get_all_local_products()
        synced = 0
        for lp in local_prods:
            try:
                res = await db.execute(select(ProductModel).filter(ProductModel.id == lp["id"]))
                existing = res.scalars().first()
                if not existing:
                    new_prod = ProductModel(
                        id=lp["id"],
                        name=lp["name"],
                        price=lp["price"],
                        cost_price=lp.get("cost_price", 0.0),
                        sku=lp.get("sku", lp["id"][:8]),
                        barcode=lp.get("barcode"),
                        category=lp.get("category", "General"),
                        stock=lp.get("stock", 0)
                    )
                    db.add(new_prod)
                    synced += 1
            except Exception as item_err:
                print(f"Error syncing local product {lp.get('name')}: {item_err}")
        await db.commit()
        return {"status": "success", "synced_count": synced}
    except Exception as e:
        return {"status": "offline", "message": str(e), "synced_count": 0}

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    result = await upload_product_image_with_fallback(contents, filename=file.filename or "")
    return result

@router.post("/sync-odoo")
async def sync_from_odoo(limit: int = Query(1000, description="Max products to sync from Odoo ERP")):
    result = await sync_all_odoo_products(limit=limit)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result

@router.get("/odoo-settings")
async def get_odoo_settings():
    return await fetch_odoo_company_settings()

