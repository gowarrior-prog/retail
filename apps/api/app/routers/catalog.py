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

@router.get("/products", response_model=list[ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db1)):
    try:
        result = await db.execute(select(ProductModel))
        return result.scalars().all()
    except Exception as e:
        print(f"Database error ({e}), reading catalog directly from local hard drive JSON backup...")
        data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
        backup_path = os.path.join(data_dir, "local_catalog_backup.json")
        if os.path.exists(backup_path):
            with open(backup_path, "r", encoding="utf-8") as f:
                return json.load(f)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

from app.services.sqlite_sync_service import save_product_locally

@router.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db1)):
    try:
        data = product.model_dump(exclude_none=False)
        if not data.get("id"):
            data["id"] = str(uuid.uuid4())
        if data.get("price") and data.get("cost_price") and not data.get("profit_margin"):
            data["profit_margin"] = round(((data["price"] - data["cost_price"]) / data["price"]) * 100, 2)
        db_product = ProductModel(**data)
        db.add(db_product)
        await db.commit()
        await db.refresh(db_product)

        # Save to local SQLite database with HMAC checksum
        try:
            save_product_locally(
                product_id=db_product.id,
                odoo_id=db_product.odoo_id,
                name=db_product.name,
                price=db_product.price,
                cost_price=db_product.cost_price,
                sku=db_product.sku or db_product.id[:8],
                barcode=db_product.barcode,
                category=db_product.category,
                stock=db_product.stock
            )
        except Exception as sq_err:
            print(f"Notice: SQLite local product save error ({sq_err}).")

        return db_product
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductCreate, db: AsyncSession = Depends(get_db1)):
    result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
    db_product = result.scalars().first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        data = product_update.model_dump(exclude_none=True)
        for k, v in data.items():
            if v is not None:
                setattr(db_product, k, v)

        if db_product.price and db_product.cost_price:
            db_product.profit_margin = ((db_product.price - db_product.cost_price) / db_product.price) * 100

        await db.commit()
        await db.refresh(db_product)
        return db_product
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db1)):
    result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
    db_product = result.scalars().first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(db_product)
    await db.commit()
    return {"message": "Product deleted from DB1 successfully"}

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
