import time
import re
from typing import Dict, List, Tuple, Any

# Sliding window rate limiter: Max 30 requests per minute per IP
RATE_LIMIT_MAX_REQUESTS = 30
RATE_LIMIT_WINDOW_SECONDS = 60
_request_records: Dict[str, List[float]] = {}

# Prompt injection, jailbreak, prompt leakage, and exploit detection patterns
JAILBREAK_PATTERNS = [
    # 1. Instruction Hijacking & Roleplay Bypasses
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above|system)\s+instructions?", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|earlier)\s+(prompts?|instructions?|rules?)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in|a|the|DAN|unrestricted|god\s*mode|an\s+unfiltered)", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"system\s*:\s*", re.IGNORECASE),
    re.compile(r"<\|im_start\|>", re.IGNORECASE),
    re.compile(r"<\|im_end\|>", re.IGNORECASE),
    re.compile(r"\[INST\]", re.IGNORECASE),
    re.compile(r"\[/INST\]", re.IGNORECASE),
    re.compile(r"<\s*s\s*>", re.IGNORECASE),
    re.compile(r"<\s*/s\s*>", re.IGNORECASE),

    # 2. System Prompt & Secrets Leakage Attacks
    re.compile(r"(repeat|output|show|print|reveal|tell\s+me|expose|leak|what\s+is)\s+(your\s+)?(system\s+prompt|initial\s+instructions?|system\s+instructions?|developer\s+mode|internal\s+rules)", re.IGNORECASE),
    re.compile(r"(api[_-]?key|secret[_-]?key|password|gemini[_-]?api[_-]?key|admin[_-]?pin|env\s+variables?)", re.IGNORECASE),

    # 3. Adversarial Billing, Price Overrides & Discount Fraud
    re.compile(r"(set|make|force|change|update)\s+(the\s+)?(price|total|cost|rate)\s+(to|=)\s*(0|zero|free|null)", re.IGNORECASE),
    re.compile(r"free\s+(order|item|cloth|suit|bill|cart)", re.IGNORECASE),
    re.compile(r"(apply|give|add)\s+100%\s+discount", re.IGNORECASE),
    re.compile(r"discount\s*[:=]?\s*100%", re.IGNORECASE),
    re.compile(r"price\s*[:=]?\s*0\s*(pkr|rs|rupees)?", re.IGNORECASE),

    # 4. SQL Injection & Database Tampering Signatures
    re.compile(r"(union\s+select|insert\s+into|delete\s+from|drop\s+table|update\s+\w+\s+set|alter\s+table|exec\s*\(|execute\s*\()", re.IGNORECASE),
    re.compile(r"['\"];\s*(drop|delete|insert|update|alter)", re.IGNORECASE),
    re.compile(r"--\s*$", re.IGNORECASE),
    re.compile(r"/\*.*?\*/", re.IGNORECASE),

    # 5. XSS & Script Injections
    re.compile(r"<\s*script[^>]*>", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"onerror\s*=", re.IGNORECASE),
    re.compile(r"onload\s*=", re.IGNORECASE),
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
    Sanitizes raw text, strips control characters, HTML tags, and detects jailbreak/prompt injection attempts.
    Returns: (cleaned_text, is_injection_detected)
    """
    if not text:
        return "", False

    # 1. Strip ASCII and Unicode control characters (except newline and tab)
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # 2. Check for adversarial injection patterns
    is_injection = False
    for pattern in JAILBREAK_PATTERNS:
        if pattern.search(cleaned):
            is_injection = True
            cleaned = pattern.sub("[SANITIZED_ADVERSARIAL_INPUT]", cleaned)

    # 3. Strip code fence and markup tags
    cleaned = cleaned.replace("```", " ").replace("<", " ").replace(">", " ")
    
    # 4. Collapse repeated whitespaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned, is_injection


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
