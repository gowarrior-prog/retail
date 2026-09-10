from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from database import Base

# DB1 Models (Catalog / Products)
class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, default=0.0)
    profit_margin = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True, unique=True)
    category = Column(String, nullable=True, default="General")
    store_id = Column(String, nullable=True)
    odoo_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

# DB2 Models (Operations / Employees / Khata / Purchases)
class EmployeeModel(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    cnic = Column(String, unique=True, nullable=True)
    role = Column(String, default="SALES_EXECUTIVE")
    base_salary = Column(Float, nullable=False)
    store_id = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class CustomerKhataModel(Base):
    __tablename__ = "customer_khata"

    id = Column(String, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    total_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class ShopPurchaseModel(Base):
    __tablename__ = "shop_purchases"

    id = Column(String, primary_key=True, index=True)
    supplier_name = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    total_cost = Column(Float, nullable=False)
    paid_amount = Column(Float, nullable=False)
    remaining = Column(Float, default=0.0)
    purchase_date = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

# DB3 Models (Billing History / Deep Analytics / Super Admin Logs)
class BillingHistoryModel(Base):
    __tablename__ = "billing_history"

    id = Column(String, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    store_id = Column(String, nullable=True)
    customer_phone = Column(String, nullable=True)
    total_amount = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    payment_mode = Column(String, default="CASH")
    cashier_name = Column(String, nullable=True)
    item_details_json = Column(String, nullable=False)
    billing_date = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())