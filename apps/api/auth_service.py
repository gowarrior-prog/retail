import os
import time
import secrets
import hashlib
import jwt
import re
from pathlib import Path
from typing import Dict, Optional, Tuple
from fastapi import Request, Response, HTTPException, Depends
from sqlalchemy.future import select
from dotenv import load_dotenv

# Load root .env
root_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=str(root_env), override=True)

from database import SessionDb1
from models import ProductModel # We will query user from DB1
from email_service import send_email_otp

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "RETAIL_ECOSYSTEM_ULTRA_SECURE_JWT_SECRET_2026_PRODUCTION_VERCEL")
JWT_ALGORITHM = "HS256"

# In-Memory Hashed Email OTP Store
# Format: { email: { "hash": str, "expires_at": float, "attempts": int, "last_sent_at": float } }
_email_otp_store: Dict[str, dict] = {}

OTP_EXPIRY_SECONDS = 300   # 5 minutes
RATE_LIMIT_SECONDS = 60    # 1 minute resend cooldown
MAX_VERIFY_ATTEMPTS = 3    # Max 3 failed attempts
ACCESS_TOKEN_EXPIRE_SECONDS = 900       # 15 minutes
REFRESH_TOKEN_EXPIRE_SECONDS = 604800   # 7 days

def normalize_email(email: str) -> str:
    return email.strip().lower()

def _hash_email_otp(email: str, otp: str) -> str:
    salt = os.getenv("EMAIL_OTP_SECRET_SALT", "EMAIL_OTP_SALT_2026_SECURE")
    raw = f"{email}:{otp}:{salt}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def generate_email_otp(email: str) -> Tuple[str, Optional[str]]:
    """Generates a secure 6-digit Email OTP with rate limiting."""
    norm = normalize_email(email)
    now = time.time()

    existing = _email_otp_store.get(norm)
    if existing and (now - existing.get("last_sent_at", 0)) < RATE_LIMIT_SECONDS:
        remaining = int(RATE_LIMIT_SECONDS - (now - existing["last_sent_at"]))
        return "", f"Please wait {remaining} seconds before requesting a new Email OTP."

    otp = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = _hash_email_otp(norm, otp)

    _email_otp_store[norm] = {
        "hash": otp_hash,
        "expires_at": now + OTP_EXPIRY_SECONDS,
        "attempts": 0,
        "last_sent_at": now
    }

    return otp, None

def create_jwt_token(data: dict, expires_in_seconds: int) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds
    payload["iat"] = int(time.time())
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def set_httponly_auth_cookies(response: Response, email: str, role: str = "CUSTOMER", is_vercel_prod: bool = True):
    """
    Sets ultra-secure HTTP-Only Cookies for Access & Refresh Tokens.
    - httponly=True: Immunity against XSS token theft!
    - secure=True: Enforced on Vercel / HTTPS production!
    - samesite="none": Enables Vercel cross-domain frontend-backend requests!
    """
    access_token = create_jwt_token({"sub": email, "role": role, "type": "access"}, ACCESS_TOKEN_EXPIRE_SECONDS)
    refresh_token = create_jwt_token({"sub": email, "role": role, "type": "refresh"}, REFRESH_TOKEN_EXPIRE_SECONDS)

    # Set Access Token Cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=is_vercel_prod, # Set True for Vercel HTTPS
        samesite="none" if is_vercel_prod else "lax",
        max_age=ACCESS_TOKEN_EXPIRE_SECONDS,
        path="/"
    )

    # Set Refresh Token Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_vercel_prod,
        samesite="none" if is_vercel_prod else "lax",
        max_age=REFRESH_TOKEN_EXPIRE_SECONDS,
        path="/auth"
    )

def clear_httponly_auth_cookies(response: Response, is_vercel_prod: bool = True):
    """Deletes HTTP-Only cookies upon Logout."""
    response.delete_cookie(key="access_token", path="/", httponly=True, secure=is_vercel_prod, samesite="none" if is_vercel_prod else "lax")
    response.delete_cookie(key="refresh_token", path="/auth", httponly=True, secure=is_vercel_prod, samesite="none" if is_vercel_prod else "lax")

def verify_email_otp(email: str, user_otp: str) -> Tuple[bool, str]:
    """Verifies user-entered Email OTP against SHA-256 hash."""
    norm = normalize_email(email)
    now = time.time()

    record = _email_otp_store.get(norm)
    if not record:
        return False, "No active OTP found for this email. Please request a new code."

    if now > record["expires_at"]:
        _email_otp_store.pop(norm, None)
        return False, "Email OTP code has expired. Please request a new code."

    if record["attempts"] >= MAX_VERIFY_ATTEMPTS:
        _email_otp_store.pop(norm, None)
        return False, "Maximum failed attempts exceeded. Please request a new OTP code."

    computed_hash = _hash_email_otp(norm, user_otp)
    if secrets.compare_digest(record["hash"], computed_hash):
        _email_otp_store.pop(norm, None)
        return True, "Email OTP verified successfully!"
    else:
        record["attempts"] += 1
        remaining = MAX_VERIFY_ATTEMPTS - record["attempts"]
        return False, f"Invalid OTP code. {remaining} attempts remaining."

async def get_current_user_from_cookie(request: Request) -> dict:
    """FastAPI Dependency that extracts and validates user JWT from HTTP-Only cookie."""
    cookie_val = request.cookies.get("access_token")
    if not cookie_val:
        # Also check Authorization header as fallback for API testing tools
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            raise HTTPException(status_code=401, detail="Authentication failed: No HTTP-Only session cookie found.")
    else:
        token = cookie_val.replace("Bearer ", "").strip()

    payload = decode_jwt_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Authentication failed: Invalid or expired HTTP-Only token cookie.")

    return {
        "email": payload.get("sub"),
        "role": payload.get("role", "CUSTOMER")
    }
