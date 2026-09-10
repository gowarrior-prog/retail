import os
import time
import secrets
import hashlib
import httpx
import re
from pathlib import Path
from typing import Dict, Optional, Tuple
from dotenv import load_dotenv

# Automatically load root .env file with override
root_env = Path(__file__).resolve().parents[1] / ".env"
if not root_env.exists():
    root_env = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=str(root_env), override=True)

# Meta WhatsApp API Credentials
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v20.0")
WHATSAPP_TEMPLATE_NAME = os.getenv("WHATSAPP_TEMPLATE_NAME", "") # Optional template name if configured in Meta dashboard

# Secure In-Memory Store for OTPs
# Format: { phone: { "hash": str, "expires_at": float, "attempts": int, "last_sent_at": float } }
_otp_store: Dict[str, dict] = {}

# Secure In-Memory Store for Verified Checkout Tokens
# Format: { token: { "phone": str, "expires_at": float } }
_verified_tokens: Dict[str, dict] = {}

OTP_EXPIRY_SECONDS = 300  # 5 minutes
RATE_LIMIT_SECONDS = 60   # 1 minute cooldown between resends
MAX_VERIFY_ATTEMPTS = 3   # Max failed attempts allowed
TOKEN_EXPIRY_SECONDS = 900 # 15 minutes for checkout completion

def normalize_phone_number(phone: str) -> str:
    """
    Normalizes phone numbers to standard E.164 format without '+' sign for WhatsApp API.
    Example: '0301 0606643' -> '923010606643'
             '+923010606643' -> '923010606643'
             '0300-1234567' -> '923001234567'
    """
    cleaned = re.sub(r'\D', '', phone)
    if cleaned.startswith('0') and len(cleaned) == 11:
        # Convert local Pakistan number 03xx-xxxxxxx to 923xx-xxxxxxx
        cleaned = '92' + cleaned[1:]
    elif cleaned.startswith('92') and len(cleaned) == 12:
        pass
    return cleaned

def _hash_otp(phone: str, otp: str) -> str:
    """Generates a secure SHA-256 hash of OTP + phone number + secret salt."""
    salt = os.getenv("OTP_SECRET_SALT", "RETAIL_ECOSYSTEM_SECURE_SALT_2026")
    raw = f"{phone}:{otp}:{salt}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def generate_secure_otp(phone: str) -> Tuple[str, Optional[str]]:
    """
    Generates a cryptographically secure 6-digit OTP with rate limiting.
    Returns: (otp_code, error_message)
    """
    norm_phone = normalize_phone_number(phone)
    now = time.time()

    # Rate Limiting Check
    existing = _otp_store.get(norm_phone)
    if existing and (now - existing.get("last_sent_at", 0)) < RATE_LIMIT_SECONDS:
        remaining = int(RATE_LIMIT_SECONDS - (now - existing["last_sent_at"]))
        return "", f"Please wait {remaining} seconds before requesting a new OTP."

    # Generate 6-digit cryptographic random OTP
    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = _hash_otp(norm_phone, otp)

    _otp_store[norm_phone] = {
        "hash": otp_hash,
        "expires_at": now + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "last_sent_at": now
    }

    return otp, None

async def send_whatsapp_message(phone: str, otp: str) -> Tuple[bool, str]:
    """
    Sends the OTP via WhatsApp Meta Cloud API.
    Attempts text message first, or template message if template is specified.
    """
    norm_phone = normalize_phone_number(phone)
    
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        return False, "WhatsApp Meta API credentials missing in .env"

    url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

    # If Meta template is configured
    if WHATSAPP_TEMPLATE_NAME:
        if "jaspers_market" in WHATSAPP_TEMPLATE_NAME.lower():
            import datetime
            date_str = datetime.date.today().strftime("%b %d, %Y")
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Valued Customer"},
                        {"type": "text", "text": otp},
                        {"type": "text", "text": date_str}
                    ]
                }
            ]
        else:
            components = [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": otp}]
                }
            ]

        payload = {
            "messaging_product": "whatsapp",
            "to": norm_phone,
            "type": "template",
            "template": {
                "name": WHATSAPP_TEMPLATE_NAME,
                "language": {"code": "en_US"},
                "components": components
            }
        }
    else:
        # Standard WhatsApp direct message
        body_text = f"🔐 Your Retail Store Checkout Verification Code is: *{otp}*\n\nValid for 5 minutes. Do NOT share this code with anyone."
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": norm_phone,
            "type": "text",
            "text": {"preview_url": False, "body": body_text}
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            res_json = res.json()

            if res.status_code in [200, 201] and "messages" in res_json:
                msg_id = res_json["messages"][0]["id"]
                return True, f"WhatsApp message sent successfully! Message ID: {msg_id}"
            else:
                err_details = res_json.get("error", {}).get("message", res.text)
                return False, f"Meta WhatsApp API Error: {err_details}"

    except Exception as e:
        return False, f"Failed to connect to Meta WhatsApp Cloud API: {str(e)}"

def verify_otp_and_issue_token(phone: str, user_otp: str) -> Tuple[bool, str, Optional[str]]:
    """
    Verifies user-entered OTP.
    Returns: (is_valid, message, verification_token)
    """
    norm_phone = normalize_phone_number(phone)
    now = time.time()

    record = _otp_store.get(norm_phone)
    if not record:
        return False, "No active OTP found for this phone number. Please request a new OTP.", None

    # Check Expiry
    if now > record["expires_at"]:
        _otp_store.pop(norm_phone, None)
        return False, "OTP has expired. Please request a new code.", None

    # Check Attempt Limit
    if record["attempts"] >= MAX_VERIFY_ATTEMPTS:
        _otp_store.pop(norm_phone, None)
        return False, "Maximum verification attempts exceeded. Please request a new OTP.", None

    # Verify Hash
    computed_hash = _hash_otp(norm_phone, user_otp)
    if secrets.compare_digest(record["hash"], computed_hash):
        # OTP Correct! Clean up OTP store
        _otp_store.pop(norm_phone, None)

        # Issue secure verification token for checkout
        token = f"VTOK-{secrets.token_urlsafe(32)}"
        _verified_tokens[token] = {
            "phone": norm_phone,
            "expires_at": now + TOKEN_EXPIRY_SECONDS
        }
        return True, "Phone number verified successfully!", token
    else:
        record["attempts"] += 1
        remaining_attempts = MAX_VERIFY_ATTEMPTS - record["attempts"]
        return False, f"Invalid OTP code. {remaining_attempts} attempts remaining.", None

def validate_checkout_token(token: str, phone: str) -> bool:
    """Validates if the checkout request possesses a valid, unexpired verification token for the phone number."""
    if not token:
        return False
    
    norm_phone = normalize_phone_number(phone)
    now = time.time()

    rec = _verified_tokens.get(token)
    if not rec:
        return False

    if now > rec["expires_at"]:
        _verified_tokens.pop(token, None)
        return False

    if rec["phone"] != norm_phone:
        return False

    return True
