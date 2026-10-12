import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from app.core.ai_security import sanitize_and_neutralize_input


class NaturalLanguageOrderRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Customer or cashier natural language order string")

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        cleaned, _ = sanitize_and_neutralize_input(v)
        if not cleaned.strip():
            raise ValueError("Order query cannot be empty after sanitization")
        return cleaned.strip()


class ParsedOrderItem(BaseModel):
    product_id: str = Field(..., min_length=1, description="Database unique product ID")
    sku: str = Field(..., min_length=1, description="Product SKU code")
    name: str = Field(..., min_length=1, description="Official product title")
    category: str = Field(default="Fabric", description="Product category")
    quantity: int = Field(default=1, ge=1, le=500, description="Validated item quantity")
    unit_price: float = Field(default=0.0, ge=0.0, description="Verified catalog unit price")
    cost_price: float = Field(default=0.0, ge=0.0, description="Catalog cost price")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Model matching confidence score")
    matched_from: str = Field(default="", description="Original query token matched")
    engine: str = Field(default="offline_nlp", description="Engine used (gemini_cloud or offline_nlp)")
    is_custom: bool = Field(default=False, description="Whether item is custom fallback")


class NaturalLanguageOrderResponse(BaseModel):
    status: str
    engine: str
    items: List[ParsedOrderItem]
    message: str
    execution_time_ms: float


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User conversational prompt")
    history: Optional[List[Dict[str, str]]] = Field(default=[], description="Recent conversation turns")
    admin_pin: Optional[str] = Field(default=None, description="Admin authorization PIN for sensitive actions")
    action_target: Optional[Dict[str, Any]] = Field(default=None, description="Context for confirmed action")
    user_id: Optional[str] = Field(default="cashier-1", description="ID of the user making the request")
    user_role: Optional[str] = Field(default="cashier", description="Role: 'cashier', 'manager', or 'owner'")

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        cleaned, _ = sanitize_and_neutralize_input(v)
        if not cleaned.strip():
            raise ValueError("Chat message cannot be empty")
        return cleaned.strip()


# ── MODULE-SPECIFIC PYDANTIC SCHEMAS ──

class KhataTransactionParsed(BaseModel):
    customer_name: str = Field(..., min_length=1, description="Mapped ledger customer name")
    amount: float = Field(..., ge=0.0, description="Exact credit/debit transaction amount in PKR")
    transaction_type: str = Field(default="CREDIT", description="'CREDIT' (received payment) or 'DEBIT' (loan/udhar)")
    phone: Optional[str] = Field(default="", description="Customer contact phone")
    notes: Optional[str] = Field(default="", description="Transaction notes or invoice reference")


class PurchaseEntryParsed(BaseModel):
    supplier_name: str = Field(..., min_length=1, description="Registered supplier or vendor name")
    item_name: str = Field(default="Fabric Stock", description="Stock item description")
    quantity: int = Field(default=0, ge=0, description="Quantity of unstitched suits/meters")
    total_cost: float = Field(default=0.0, ge=0.0, description="Total vendor bill cost in PKR")
    paid_amount: float = Field(default=0.0, ge=0.0, description="Amount paid immediately")
    remaining: float = Field(default=0.0, ge=0.0, description="Remaining balance owed to supplier")


class EmployeeActionParsed(BaseModel):
    name: str = Field(..., min_length=1, description="Staff member full name")
    job_title: str = Field(default="Sales Staff", description="Employee role / job title")
    department: str = Field(default="Sales", description="Store department")
    salary: float = Field(default=0.0, ge=0.0, description="Monthly agreed salary")
    phone: Optional[str] = Field(default="", description="Contact phone")


class AIChatResponse(BaseModel):
    status: str = "success"
    engine: str = "gemini_cloud"
    intent: str = "chat"  # chat, analytics, trends, order, ledger, add_khata, add_purchase, add_employee, print, delete, rbac_blocked
    reply_text: str = ""
    language: str = "roman_urdu"  # english, roman_urdu, urdu
    items: List[ParsedOrderItem] = []
    analytics_data: Optional[Dict[str, Any]] = None
    ledger_data: Optional[Dict[str, Any]] = None
    print_data: Optional[Dict[str, Any]] = None
    product_data: Optional[Dict[str, Any]] = None
    employee_data: Optional[EmployeeActionParsed] = None
    purchase_data: Optional[PurchaseEntryParsed] = None
    khata_entry: Optional[KhataTransactionParsed] = None
    requires_pin: bool = False
    action_executed: Optional[str] = None
    execution_time_ms: float = 0.0

