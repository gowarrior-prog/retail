import os
import time
import secrets
import hashlib
import httpx
import re
from pathlib import Path
from typing import Dict, Optional, Tuple
from dotenv import load_dotenv

root_env = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=str(root_env), override=True)

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v20.0")
WHATSAPP_TEMPLATE_NAME = os.getenv("WHATSAPP_TEMPLATE_NAME", "")

_otp_store: Dict[str, dict] = {}
_verified_tokens: Dict[str, dict] = {}

OTP_EXPIRY_SECONDS = 300
RATE_LIMIT_SECONDS = 60
MAX_VERIFY_ATTEMPTS = 3
TOKEN_EXPIRY_SECONDS = 900

def normalize_phone_number(phone: str) -> str:
    cleaned = re.sub(r'\D', '', phone)
    if cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = '92' + cleaned[1:]
    return cleaned

def _hash_otp(phone: str, otp: str) -> str:
    salt = os.getenv("OTP_SECRET_SALT", "RETAIL_ECOSYSTEM_SECURE_SALT_2026")
    raw = f"{phone}:{otp}:{salt}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def generate_secure_otp(phone: str) -> Tuple[str, Optional[str]]:
    norm_phone = normalize_phone_number(phone)
    now = time.time()

    existing = _otp_store.get(norm_phone)
    if existing and (now - existing.get("last_sent_at", 0)) < RATE_LIMIT_SECONDS:
        remaining = int(RATE_LIMIT_SECONDS - (now - existing["last_sent_at"]))
        return "", f"Please wait {remaining} seconds before requesting a new OTP."

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
    norm_phone = normalize_phone_number(phone)
    
    if not WHATSAPP_ACCESS_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        return False, "WhatsApp Meta API credentials missing in .env"

    url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }

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
    norm_phone = normalize_phone_number(phone)
    now = time.time()

    record = _otp_store.get(norm_phone)
    if not record:
        return False, "No active OTP found for this phone number. Please request a new OTP.", None

    if now > record["expires_at"]:
        _otp_store.pop(norm_phone, None)
        return False, "OTP has expired. Please request a new code.", None

    if record["attempts"] >= MAX_VERIFY_ATTEMPTS:
        _otp_store.pop(norm_phone, None)
        return False, "Maximum verification attempts exceeded. Please request a new OTP.", None

    computed_hash = _hash_otp(norm_phone, user_otp)
    if secrets.compare_digest(record["hash"], computed_hash):
        _otp_store.pop(norm_phone, None)
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
