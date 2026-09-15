from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base1

class UserModel(Base1):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="ADMIN")
    phone = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

class ProductModel(Base1):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    cost_price = Column(Float, default=0.0)
    profit_margin = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    category = Column(String, nullable=True, default="General")
    image_url = Column(String, nullable=True)
    odoo_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

class OrderModel(Base1):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    total_amount = Column(Float, nullable=False)
    type = Column(String, default="POS_COUNTER")
    status = Column(String, default="COMPLETED")
    user_id = Column(String, nullable=True)
    items_json = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())
