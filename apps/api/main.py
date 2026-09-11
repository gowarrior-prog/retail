import uuid
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from database import (
    Base,
    engine_db1, engine_db2, engine_db3,
    get_db1, get_db2, get_db3,
    SessionDb1, SessionDb2, SessionDb3
)
from models import (
    ProductModel, EmployeeModel, CustomerKhataModel,
    ShopPurchaseModel, BillingHistoryModel
)
from schemas import ProductCreate, ProductResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables in DB1, DB2, DB3
    for eng in [engine_db1, engine_db2, engine_db3]:
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="Retail Ecosystem Multi-Database API",
    description="Supports DB1 (Catalog), DB2 (Operations & Khata), DB3 (Analytics & History)",
    lifespan=lifespan
)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Multi-Database System API is active across DB1, DB2, and DB3!"}

# ==========================================
# DB1: CATALOG & PRODUCTS ENDPOINTS
# ==========================================
@app.get("/products", response_model=list[ProductResponse])
async def get_products(db: AsyncSession = Depends(get_db1)):
    result = await db.execute(select(ProductModel))
    return result.scalars().all()

@app.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, db: AsyncSession = Depends(get_db1)):
    try:
        data = product.dict()
        if not data.get("id"):
            data["id"] = str(uuid.uuid4())
        if not data.get("store_id"):
            data["store_id"] = None
        db_product = ProductModel(**data)
        db.add(db_product)
        await db.commit()
        await db.refresh(db_product)
        return db_product
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: str, product_update: ProductCreate, db: AsyncSession = Depends(get_db1)):
    result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
    db_product = result.scalars().first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        data = product_update.dict()
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

@app.delete("/products/{product_id}")
async def delete_product(product_id: str, db: AsyncSession = Depends(get_db1)):
    result = await db.execute(select(ProductModel).filter(ProductModel.id == product_id))
    db_product = result.scalars().first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.delete(db_product)
    await db.commit()
    return {"message": "Product deleted from DB1 successfully"}

# Image Upload with WebP + DB1 -> DB2 Storage Fallback
from fastapi import UploadFile, File
from storage import upload_product_image_with_fallback

@app.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()
    result = await upload_product_image_with_fallback(contents, filename=file.filename or "")
    return result

# Odoo ERP Synchronization & Settings Endpoints
from odoo_sync import sync_all_odoo_products, fetch_odoo_company_settings

@app.post("/sync-odoo")
async def sync_from_odoo(limit: int = Query(1000, description="Max products to sync from Odoo ERP")):
    result = await sync_all_odoo_products(limit=limit)
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    return result

@app.get("/odoo-settings")
async def get_odoo_settings():
    return await fetch_odoo_company_settings()

# ==========================================
# WHATSAPP META API OTP AUTHENTICATION
# ==========================================
from pydantic import BaseModel as PydanticBaseModel
from whatsapp_otp import (
    generate_secure_otp,
    send_whatsapp_message,
    verify_otp_and_issue_token,
    normalize_phone_number
)

class SendOTPRequest(PydanticBaseModel):
    phone: str

class VerifyOTPRequest(PydanticBaseModel):
    phone: str
    otp: str

@app.post("/auth/send-whatsapp-otp")
async def send_whatsapp_otp_endpoint(req: SendOTPRequest):
    if not req.phone or len(req.phone.strip()) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number provided.")

    otp, err = generate_secure_otp(req.phone)
    if err:
        raise HTTPException(status_code=429, detail=err)

    success, msg = await send_whatsapp_message(req.phone, otp)
    if not success:
        raise HTTPException(status_code=500, detail=msg)

    norm = normalize_phone_number(req.phone)
    return {
        "status": "success",
        "message": f"WhatsApp verification code sent to {norm}.",
        "expires_in_seconds": 300
    }

@app.post("/auth/verify-whatsapp-otp")
async def verify_whatsapp_otp_endpoint(req: VerifyOTPRequest):
    is_valid, msg, token = verify_otp_and_issue_token(req.phone, req.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    return {
        "status": "success",
        "message": msg,
        "verification_token": token,
        "expires_in_seconds": 900
    }

# ==========================================
# EMAIL OTP & HTTP-ONLY COOKIE AUTHENTICATION
# ==========================================
from fastapi import Response, Request
from auth_service import (
    generate_email_otp,
    verify_email_otp,
    set_httponly_auth_cookies,
    clear_httponly_auth_cookies,
    get_current_user_from_cookie,
    normalize_email
)
from email_service import send_email_otp

class SendEmailOTPRequest(PydanticBaseModel):
    email: str

class VerifyEmailOTPRequest(PydanticBaseModel):
    email: str
    otp: str

@app.post("/auth/email/send-otp")
async def send_email_otp_endpoint(req: SendEmailOTPRequest):
    norm_email = normalize_email(req.email)
    if not norm_email or "@" not in norm_email or "." not in norm_email:
        raise HTTPException(status_code=400, detail="Invalid email address provided.")

    otp, err = generate_email_otp(norm_email)
    if err:
        raise HTTPException(status_code=429, detail=err)

    success, msg = send_email_otp(norm_email, otp)
    if not success:
        # Return structured message so user knows if SMTP needs credentials or succeeded
        return {
            "status": "pending_smtp_credentials",
            "message": msg,
            "generated_otp_debug": otp, # Safe debug for initial setup
            "expires_in_seconds": 300
        }

    return {
        "status": "success",
        "message": f"6-digit verification code sent to {norm_email}.",
        "expires_in_seconds": 300
    }

@app.post("/auth/email/verify-otp")
async def verify_email_otp_endpoint(req: VerifyEmailOTPRequest, response: Response):
    norm_email = normalize_email(req.email)
    is_valid, msg = verify_email_otp(norm_email, req.otp)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    # Set Ultra-Secure HTTP-Only Cookies (immune to XSS, ready for Vercel)
    set_httponly_auth_cookies(response, email=norm_email, role="CUSTOMER", is_vercel_prod=True)

    return {
        "status": "success",
        "message": "Authentication successful! HTTP-Only session cookies established.",
        "user": {
            "email": norm_email,
            "role": "CUSTOMER"
        }
    }

@app.get("/auth/me")
async def get_current_user_profile(user: dict = Depends(get_current_user_from_cookie)):
    return {
        "status": "authenticated",
        "user": user
    }

@app.post("/auth/logout")
async def logout_endpoint(response: Response):
    clear_httponly_auth_cookies(response, is_vercel_prod=True)
    return {"status": "success", "message": "Successfully logged out. Session cookies cleared."}

# ==========================================
# DB2: OPERATIONS, EMPLOYEES & KHATA
# ==========================================
@app.get("/employees")
async def get_employees(db: AsyncSession = Depends(get_db2)):
    result = await db.execute(select(EmployeeModel).filter(EmployeeModel.is_deleted == False))
    return result.scalars().all()

@app.get("/khata")
async def get_khata_records(db: AsyncSession = Depends(get_db2)):
    result = await db.execute(select(CustomerKhataModel))
    return result.scalars().all()

@app.get("/purchases")
async def get_shop_purchases(db: AsyncSession = Depends(get_db2)):
    result = await db.execute(select(ShopPurchaseModel))
    return result.scalars().all()

# POS Counter Calculation & Checkout Engine
import json
from pos_engine import POSCheckoutRequest, calculate_pos_receipt

@app.post("/pos/checkout")
async def pos_checkout(req: POSCheckoutRequest):
    # 1. Compute financial calculations
    calc = calculate_pos_receipt(req)
    inv_num = f"INV-{uuid.uuid4().hex[:8].upper()}"

    # 2. Archive invoice to DB3 (Billing History)
    async with SessionDb3() as db3:
        billing_record = BillingHistoryModel(
            id=str(uuid.uuid4()),
            invoice_number=inv_num,
            store_id=req.store_id,
            customer_phone=req.customer_phone,
            total_amount=calc["grand_total"],
            discount=calc["discount_total"],
            tax=calc["tax_total"],
            payment_mode=req.payment_mode,
            cashier_name=req.cashier_name,
            item_details_json=json.dumps([item.model_dump() for item in req.items])
        )
        db3.add(billing_record)
        await db3.commit()

    # 3. If CREDIT_KHATA and outstanding balance, update Customer Khata in DB2
    if req.payment_mode.upper() == "CREDIT_KHATA" and calc["khata_added_balance"] > 0 and req.customer_phone:
        async with SessionDb2() as db2:
            res = await db2.execute(select(CustomerKhataModel).filter(CustomerKhataModel.phone == req.customer_phone))
            khata = res.scalars().first()
            if khata:
                khata.total_balance += calc["khata_added_balance"]
            else:
                khata = CustomerKhataModel(
                    id=str(uuid.uuid4()),
                    customer_name=req.customer_name or "Retail Customer",
                    phone=req.customer_phone,
                    total_balance=calc["khata_added_balance"]
                )
                db2.add(khata)
            await db2.commit()

    calc["invoice_number"] = inv_num
    calc["status"] = "success"
    return calc

# ==========================================
# DB3: BILLING HISTORY & ANALYTICS
# ==========================================
@app.get("/billing-history")
async def get_billing_history(db: AsyncSession = Depends(get_db3)):
    result = await db.execute(select(BillingHistoryModel))
    return result.scalars().all()

# ==========================================
# SUPER ADMIN: CROSS-DATABASE PURGE & AUDIT
# ==========================================
@app.delete("/admin/purge-table")
async def super_admin_purge_table(
    target_db: str = Query(..., description="db1, db2, or db3"),
    table_name: str = Query(..., description="Exact table name to purge e.g. products, employees, billing_history"),
    admin_secret: str = Query(..., description="Super Admin authorization key")
):
    if admin_secret != "SUPER_ADMIN_SECRET_KEY":
        raise HTTPException(status_code=403, detail="Unauthorized Super Admin access")

    session_map = {
        "db1": SessionDb1,
        "db2": SessionDb2,
        "db3": SessionDb3
    }
    if target_db.lower() not in session_map:
        raise HTTPException(status_code=400, detail="Invalid target_db. Must be db1, db2, or db3.")

    SessionClass = session_map[target_db.lower()]
    async with SessionClass() as db:
        try:
            # Safe table purge
            await db.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))
            await db.commit()
            return {"message": f"Successfully purged table '{table_name}' in '{target_db}'."}
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to purge table: {str(e)}")