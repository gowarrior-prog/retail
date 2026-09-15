from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    cost_price: Optional[float] = 0.0
    profit_margin: Optional[float] = 0.0
    stock: int = 0
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = "General"
    image_url: Optional[str] = None
    odoo_id: Optional[int] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    cost_price: Optional[float] = None
    profit_margin: Optional[float] = None
    stock: Optional[int] = 0
    sku: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    odoo_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
