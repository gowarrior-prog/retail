from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    stock: int = 0
    sku: Optional[str] = None
    category: Optional[str] = "General"
    store_id: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    sku: Optional[str] = None
    category: Optional[str] = None
    store_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
