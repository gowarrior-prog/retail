import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.schemas.ai import NaturalLanguageOrderRequest, NaturalLanguageOrderResponse, ParsedOrderItem
from app.core.ai_security import check_rate_limit
from app.services.ai_service import (
    parse_natural_language_hybrid,
    generate_copilot_insights_hybrid,
    get_copilot_sales_data,
    get_active_gemini_key,
)

router = APIRouter(prefix="/ai", tags=["AI Smart Manager"])


@router.post("/parse-order", response_model=NaturalLanguageOrderResponse)
async def parse_order_endpoint(req: NaturalLanguageOrderRequest, request: Request):
    """
    Secure Natural Language Order Parser:
    - Strictly authenticated on backend via .env GEMINI_API_KEY.
    - Rate-limited to prevent abuse or cost spikes.
    - Prompt-injection neutralized with structural boundaries.
    - Pydantic schema validated with SQLite price enforcement.
    - 0ms Offline-First Fallback.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Enforce rate limit (30 req / min)
    if not check_rate_limit(client_ip):
        # Gracefully handle over-limit by routing to offline parser without dropping transaction
        from app.services.ai_service import parse_natural_language_offline, load_catalog_products
        from app.core.ai_security import enforce_catalog_prices
        cat = load_catalog_products()
        offline_items = enforce_catalog_prices(parse_natural_language_offline(req.query, cat), cat)
        return NaturalLanguageOrderResponse(
            status="rate_limited_fallback",
            engine="offline_nlp",
            items=[ParsedOrderItem(**i) for i in offline_items],
            message="Rate limit reached. Order processed instantly via Offline Parser.",
            execution_time_ms=0.5
        )

    result = await parse_natural_language_hybrid(req.query)
    return NaturalLanguageOrderResponse(
        status=result.get("status", "success"),
        engine=result.get("engine", "offline_nlp"),
        items=[ParsedOrderItem(**i) for i in result.get("items", [])],
        message=result.get("message", "Success"),
        execution_time_ms=result.get("execution_time_ms", 1.0)
    )


@router.get("/copilot-insights")
async def get_copilot_insights_endpoint(request: Request):
    """
    AI Sales Copilot:
    Analyzes local SQLite sales, bills, inventory and returns business insights,
    restock warnings, and sales summaries. Key is strictly sourced from backend .env.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    if not check_rate_limit(client_ip):
        # Offline rule fallback
        return {
            "status": "rate_limited_fallback",
            "engine": "offline_rules",
            "data": get_copilot_sales_data(),
            "insights": [
                {
                    "type": "sales",
                    "title": "Local Store Data Active",
                    "description": "Rate limit protection active. Sales insights compiled locally.",
                    "icon": "shield-check"
                }
            ],
            "message": "Compiled via local telemetry."
        }

    try:
        return await generate_copilot_insights_hybrid()
    except Exception as e:
        return {
            "status": "fallback",
            "engine": "offline_rules",
            "data": get_copilot_sales_data(),
            "insights": [
                {
                    "type": "sales",
                    "title": "Local Sales Insights Active",
                    "description": "Sales and inventory data is protected and available offline.",
                    "icon": "shield-check"
                }
            ],
            "message": f"Generated locally: {str(e)}"
        }


@router.get("/status")
async def get_ai_status():
    """
    Checks AI operational status:
    Reports whether Gemini Cloud is configured in .env or Offline Hybrid engine is active.
    NEVER exposes key contents.
    """
    active_key = get_active_gemini_key()
    return {
        "status": "online",
        "has_gemini_key": bool(active_key),
        "primary_engine": "gemini_cloud" if active_key else "offline_nlp",
        "fallback_engine": "offline_nlp",
        "offline_ready": True,
        "supported_languages": ["English", "Roman Urdu", "Urdu"]
    }
