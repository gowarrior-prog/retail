import time
import re
from typing import Dict, List, Tuple, Any

# Sliding window rate limiter: Max 30 requests per minute per IP
RATE_LIMIT_MAX_REQUESTS = 30
RATE_LIMIT_WINDOW_SECONDS = 60
_request_records: Dict[str, List[float]] = {}

# Prompt injection & jailbreak detection patterns
JAILBREAK_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+instructions?", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in|a|the)", re.IGNORECASE),
    re.compile(r"system\s*:\s*", re.IGNORECASE),
    re.compile(r"<\|im_start\|>", re.IGNORECASE),
    re.compile(r"\[INST\]", re.IGNORECASE),
    re.compile(r"set\s+price\s+to\s+0", re.IGNORECASE),
    re.compile(r"free\s+order", re.IGNORECASE),
    re.compile(r"delete\s+from", re.IGNORECASE),
    re.compile(r"drop\s+table", re.IGNORECASE),
]


def check_rate_limit(client_ip: str) -> bool:
    """Returns True if within rate limit, False if exceeded."""
    now = time.time()
    records = _request_records.get(client_ip, [])
    # Filter out timestamps older than the window
    valid_records = [t for t in records if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(valid_records) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    valid_records.append(now)
    _request_records[client_ip] = valid_records
    return True


def sanitize_and_neutralize_input(text: str) -> Tuple[str, bool]:
    """
    Sanitizes raw text, strips control characters, and detects jailbreak/prompt injection attempts.
    Returns: (cleaned_text, is_injection_detected)
    """
    if not text:
        return "", False

    # 1. Strip control characters
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # 2. Check for jailbreak patterns
    is_injection = False
    for pattern in JAILBREAK_PATTERNS:
        if pattern.search(cleaned):
            is_injection = True
            # Neutralize matched pattern
            cleaned = pattern.sub("[FILTERED_INPUT]", cleaned)

    # 3. Strip code fence injections
    cleaned = cleaned.replace("```", " ").replace("<", " ").replace(">", " ")
    return cleaned.strip(), is_injection


def enforce_catalog_prices(parsed_items: List[Dict[str, Any]], catalog: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    SECURITY SAFEGUARD:
    Completely eliminates price tampering. The LLM is NEVER trusted with prices.
    Forces all unit prices and cost prices to match the genuine local SQLite database.
    """
    catalog_by_id = {str(p["id"]): p for p in catalog}
    catalog_by_sku = {str(p["sku"]).upper(): p for p in catalog if p.get("sku")}

    verified_items = []
    for item in parsed_items:
        p_id = str(item.get("product_id", ""))
        p_sku = str(item.get("sku", "")).upper()

        real_product = catalog_by_id.get(p_id) or catalog_by_sku.get(p_sku)
        if real_product:
            item["product_id"] = str(real_product["id"])
            item["sku"] = str(real_product["sku"])
            item["name"] = str(real_product["name"])
            item["category"] = str(real_product.get("category", "Fabric"))
            # STRICT DATABASE OVERRIDE
            item["unit_price"] = float(real_product["price"])
            item["cost_price"] = float(real_product.get("cost_price", 0.0))
            item["is_custom"] = False
        else:
            # Custom fallback item has unit_price forced to 0 or manual lookup
            item["unit_price"] = 0.0
            item["cost_price"] = 0.0
            item["is_custom"] = True

        verified_items.append(item)

    return verified_items
