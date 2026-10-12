import os
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.schemas.ai import (
    NaturalLanguageOrderRequest,
    NaturalLanguageOrderResponse,
    ParsedOrderItem,
    AIChatRequest,
    AIChatResponse
)
from app.core.ai_security import check_rate_limit
from app.services.ai_service import (
    parse_natural_language_hybrid,
    generate_copilot_insights_hybrid,
    get_copilot_sales_data,
    get_active_gemini_key,
    process_ai_chat_hybrid,
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


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat_endpoint(req: AIChatRequest, request: Request):
    """
    Unified Conversational AI Manager:
    - Multi-intent routing: chat, analytics, trends, ledger, print, delete, order.
    - True multilingual mirroring (English, Roman Urdu, Urdu).
    - Role-Based Access Control (RBAC): Cashiers restricted to cart/catalog lookup.
    - Protected operations: requires Admin PIN ("1234") before deletion.
    - SQLite ai_audit_logs logging on every AI interaction.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_rate_limit(client_ip)

    user_role = (req.user_role or "cashier").lower().strip()
    user_id = req.user_id or "user-1"

    # ── RBAC ENFORCEMENT CHECK ──
    # Cashiers cannot access sensitive modules: Purchases, Khata Ledgers, Store Profit/Analytics, Employee Payroll
    sensitive_cashier_keywords = [
        "purchase", "purchases", "khareedari", "supplier", "dealer", "wholesaler",
        "khata", "ledger", "udhar", "baqi", "karz",
        "profit", "munafa", "margin", "analytics", "bikri", "revenue",
        "employee", "mulazim", "staff", "tankhwah", "salary", "payroll"
    ]
    lower_msg = req.message.lower()

    if user_role == "cashier":
        # Check if query requests restricted manager/owner data
        is_restricted = any(kw in lower_msg for kw in sensitive_cashier_keywords)
        # However, basic ordering fabric terms (e.g., "cotton", "suit") are permitted
        if is_restricted and not any(order_word in lower_msg for order_word in ["suit", "thaan", "meter", "kapra", "add to cart"]):
            from app.services.sqlite_sync_service import log_ai_audit_event
            log_ai_audit_event(
                user_id=user_id,
                role=user_role,
                module="rbac",
                action="blocked_unauthorized_access",
                original_prompt=req.message,
                parsed_json={"reason": "Cashier restricted from manager modules"},
                status="blocked_rbac",
                execution_time_ms=0.5
            )
            return AIChatResponse(
                status="rbac_restricted",
                engine="offline_nlp",
                intent="rbac_blocked",
                reply_text="⚠️ Access Restricted: Cashier role can only perform cart operations (Add/Edit/Delete) and fabric catalog lookup. Ledger, Purchases, and Financial Reports require Manager or Owner authorization.",
                language="english",
                items=[],
                requires_pin=False,
                action_executed="RBAC: Blocked cashier from manager-restricted modules.",
                execution_time_ms=0.5
            )

    # Process AI interaction
    res = await process_ai_chat_hybrid(
        message=req.message,
        history=req.history,
        admin_pin=req.admin_pin
    )

    items = [ParsedOrderItem(**i) for i in res.get("items", [])]

    # Validate module-specific Pydantic schemas if data exists
    pur_obj = None
    if res.get("purchase_data"):
        try:
            from app.schemas.ai import PurchaseEntryParsed
            pur_obj = PurchaseEntryParsed(**res["purchase_data"])
        except Exception:
            pass

    emp_obj = None
    if res.get("employee_data"):
        try:
            from app.schemas.ai import EmployeeActionParsed
            emp_obj = EmployeeActionParsed(**res["employee_data"])
        except Exception:
            pass

    # ── AUDIT LOGGING (ai_audit_logs table) ──
    try:
        from app.services.sqlite_sync_service import log_ai_audit_event
        log_ai_audit_event(
            user_id=user_id,
            role=user_role,
            module=res.get("intent", "chat"),
            action=res.get("action_executed") or res.get("intent", "query"),
            original_prompt=req.message,
            parsed_json={
                "intent": res.get("intent"),
                "items_count": len(items),
                "has_analytics": bool(res.get("analytics_data")),
                "has_ledger": bool(res.get("ledger_data")),
                "has_purchase": bool(pur_obj),
                "has_employee": bool(emp_obj),
            },
            status="success" if res.get("status") != "error" else "failed",
            execution_time_ms=float(res.get("execution_time_ms", 0.0))
        )
    except Exception as audit_err:
        print(f"Notice logging ai audit event: {audit_err}")

    # Persist conversation turn to local SQLite and sync to Cloud DB2
    try:
        import uuid
        import asyncio
        from app.services.sqlite_sync_service import save_ai_chat_message, sync_ai_message_to_db2
        u_id = f"msg-u-{uuid.uuid4().hex[:8]}"
        a_id = f"msg-a-{uuid.uuid4().hex[:8]}"
        save_ai_chat_message(u_id, "user", req.message, res.get("intent"))
        
        meta_dict = {
            "analytics_data": res.get("analytics_data"),
            "ledger_data": res.get("ledger_data"),
            "product_data": res.get("product_data"),
            "employee_data": res.get("employee_data"),
            "purchase_data": res.get("purchase_data"),
            "print_data": res.get("print_data"),
            "action_executed": res.get("action_executed"),
        }
        save_ai_chat_message(a_id, "ai", res.get("reply_text", ""), res.get("intent"), meta_dict)
        
        asyncio.create_task(sync_ai_message_to_db2(u_id, "user", req.message, res.get("intent"), None))
        asyncio.create_task(sync_ai_message_to_db2(a_id, "ai", res.get("reply_text", ""), res.get("intent"), meta_dict))
    except Exception as e:
        print(f"Notice saving AI chat history: {e}")

    return AIChatResponse(
        status=res.get("status", "success"),
        engine=res.get("engine", "offline_nlp"),
        intent=res.get("intent", "chat"),
        reply_text=res.get("reply_text", ""),
        language=res.get("language", "roman_urdu"),
        items=items,
        analytics_data=res.get("analytics_data"),
        ledger_data=res.get("ledger_data"),
        print_data=res.get("print_data"),
        product_data=res.get("product_data"),
        employee_data=emp_obj,
        purchase_data=pur_obj,
        requires_pin=res.get("requires_pin", False),
        action_executed=res.get("action_executed"),
        execution_time_ms=res.get("execution_time_ms", 0.0)
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


@router.get("/history")
async def get_ai_history_endpoint(limit: int = 40):
    """Fetches AI conversation history from local SQLite / DB2."""
    from app.services.sqlite_sync_service import get_recent_ai_chat_history
    history = get_recent_ai_chat_history(limit=limit)
    return {"status": "success", "history": history}


@router.delete("/history")
async def clear_ai_history_endpoint():
    """Clears AI conversation history from local SQLite."""
    from app.services.sqlite_sync_service import clear_all_local_ai_history
    clear_all_local_ai_history()
    return {"status": "success", "message": "AI conversation history cleared from database."}


@router.get("/audit-logs")
async def get_ai_audit_logs_endpoint(limit: int = 50, offset: int = 0):
    """
    Returns complete AI audit trail logs from local SQLite ai_audit_logs table.
    Enables owner/manager transparency into every natural language command executed.
    """
    from app.services.sqlite_sync_service import get_ai_audit_logs
    logs = get_ai_audit_logs(limit=limit, offset=offset)
    return {"status": "success", "total": len(logs), "logs": logs}


@router.get("/anomalies")
async def get_ai_anomalies_endpoint(limit: int = 50):
    """
    Runs real-time AI anomaly detection on recent transactions (discounts > 20%,
    sales below cost price, off-hours sales) and returns active alerts.
    """
    from app.services.sqlite_sync_service import audit_recent_bills_for_anomalies, get_ai_anomaly_alerts
    # Run dynamic audit
    audit_recent_bills_for_anomalies(limit=limit)
    # Fetch all stored alerts
    alerts = get_ai_anomaly_alerts(limit=limit)
    return {"status": "success", "total_alerts": len(alerts), "alerts": alerts}


@router.get("/integrity-check")
async def get_ledger_integrity_endpoint():
    """
    Cryptographic verification endpoint:
    Checks SHA-256 HMAC checksums of all bills and products in pos_local.db
    to detect any external database tampering or unauthorized row manipulation.
    """
    from app.services.sqlite_sync_service import verify_all_local_ledger_integrity
    report = verify_all_local_ledger_integrity()
    return {"status": "success", "report": report}

