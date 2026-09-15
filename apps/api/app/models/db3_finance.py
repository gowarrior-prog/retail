from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func
from app.core.database import Base3

class BillingHistoryModel(Base3):
    __tablename__ = "billing_history"

    id = Column(String, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    customer_phone = Column(String, nullable=True)
    total_amount = Column(Float, nullable=False)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    payment_mode = Column(String, default="CASH")
    cashier_name = Column(String, nullable=True)
    item_details_json = Column(String, nullable=False)
    billing_date = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class CustomerKhataModel(Base3):
    __tablename__ = "customer_khata"

    id = Column(String, primary_key=True, index=True)
    customer_name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    total_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class KhataTransactionModel(Base3):
    __tablename__ = "khata_transactions"

    id = Column(String, primary_key=True, index=True)
    khata_id = Column(String, nullable=False)
    type = Column(String, nullable=False) # DEBIT, CREDIT
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class ShopPurchaseModel(Base3):
    __tablename__ = "shop_purchases"

    id = Column(String, primary_key=True, index=True)
    supplier_name = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    total_cost = Column(Float, nullable=False)
    paid_amount = Column(Float, nullable=False)
    remaining = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    purchase_date = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class DailySalesAnalyticsModel(Base3):
    __tablename__ = "daily_sales_analytics"

    id = Column(String, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), unique=True, nullable=False)
    total_sales_count = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    total_profit = Column(Float, default=0.0)
    top_category = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())

class SuperAdminAuditLogModel(Base3):
    __tablename__ = "super_admin_audit_logs"

    id = Column(String, primary_key=True, index=True)
    action = Column(String, nullable=False)
    target_db = Column(String, nullable=False)
    performed_by = Column(String, nullable=False)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
