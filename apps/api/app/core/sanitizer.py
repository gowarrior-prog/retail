import re
from typing import Optional, Any

_HTML_TAG_REGEX = re.compile(r"<[^>]+>", re.IGNORECASE)
_DANGEROUS_BLOCK_REGEX = re.compile(r"<(script|iframe|style|object|embed)[\s\S]*?<\/\1>", re.IGNORECASE)
_EVENT_HANDLER_REGEX = re.compile(r"on\w+\s*=\s*['\"][^'\"]*['\"]", re.IGNORECASE)
_JAVASCRIPT_URI_REGEX = re.compile(r"(javascript|vbscript|data):", re.IGNORECASE)
_BARCODE_SAFE_REGEX = re.compile(r"[^a-zA-Z0-9\-_./]")
_PHONE_SAFE_REGEX = re.compile(r"[^\d+\- ]")

def sanitize_text(val: Optional[str]) -> Optional[str]:
    """
    Sanitizes user input string against Stored XSS, HTML Injection, and script execution.
    Strips dangerous tags (<script>, <iframe>), event handlers (onload, onerror), and HTML markup.
    """
    if val is None or not isinstance(val, str):
        return val

    cleaned = val.strip()
    # 1. Remove dangerous blocks
    cleaned = _DANGEROUS_BLOCK_REGEX.sub("", cleaned)
    # 2. Remove script / scheme protocols
    cleaned = _JAVASCRIPT_URI_REGEX.sub("", cleaned)
    # 3. Remove event handlers
    cleaned = _EVENT_HANDLER_REGEX.sub("", cleaned)
    # 4. Remove all remaining HTML tags
    cleaned = _HTML_TAG_REGEX.sub("", cleaned)
    return cleaned.strip()

def sanitize_barcode(code: Optional[str]) -> Optional[str]:
    """
    Ensures barcode and SKU values contain only safe alphanumeric and standard delimiter characters.
    """
    if code is None or not isinstance(code, str):
        return code
    return _BARCODE_SAFE_REGEX.sub("", code.strip())

def sanitize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Restricts phone number inputs to valid telephony characters (digits, +, -, space).
    """
    if phone is None or not isinstance(phone, str):
        return phone
    return _PHONE_SAFE_REGEX.sub("", phone.strip())

def sanitize_payload_dict(data: dict[str, Any]) -> dict[str, Any]:
    """
    Recursively iterates through dictionary fields and sanitizes all string inputs.
    """
    sanitized = {}
    for k, v in data.items():
        if isinstance(v, str):
            if k in ("barcode", "sku", "return_code"):
                sanitized[k] = sanitize_barcode(v)
            elif k in ("customer_phone", "phone"):
                sanitized[k] = sanitize_phone(v)
            else:
                sanitized[k] = sanitize_text(v)
        elif isinstance(v, dict):
            sanitized[k] = sanitize_payload_dict(v)
        elif isinstance(v, list):
            sanitized[k] = [
                sanitize_payload_dict(item) if isinstance(item, dict)
                else (sanitize_text(item) if isinstance(item, str) else item)
                for item in v
            ]
        else:
            sanitized[k] = v
    return sanitized
