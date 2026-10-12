import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class NaturalLanguageOrderRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Customer or cashier natural language order string")

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        # Strip control characters and sanitize
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', v)
        # Neutralize markdown/XML delimiters
        cleaned = cleaned.replace("<", " ").replace(">", " ")
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

    @field_validator("message")
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', v)
        cleaned = cleaned.replace("<", " ").replace(">", " ")
        if not cleaned.strip():
            raise ValueError("Chat message cannot be empty")
        return cleaned.strip()


class AIChatResponse(BaseModel):
    status: str = "success"
    engine: str = "gemini_cloud"
    intent: str = "chat"  # chat, analytics, trends, order, ledger, print, delete
    reply_text: str = ""
    language: str = "roman_urdu"  # english, roman_urdu, urdu
    items: List[ParsedOrderItem] = []
    analytics_data: Optional[Dict[str, Any]] = None
    ledger_data: Optional[Dict[str, Any]] = None
    print_data: Optional[Dict[str, Any]] = None
    requires_pin: bool = False
    action_executed: Optional[str] = None
    execution_time_ms: float = 0.0
