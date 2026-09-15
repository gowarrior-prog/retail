from fastapi import APIRouter, HTTPException, Depends, Response, Request
from app.schemas.auth import (
    SendOTPRequest,
    VerifyOTPRequest,
    SendEmailOTPRequest,
    VerifyEmailOTPRequest,
)
from app.services.whatsapp_service import (
    generate_secure_otp,
    send_whatsapp_message,
    verify_otp_and_issue_token,
    normalize_phone_number,
)
from app.services.auth_service import (
    generate_email_otp,
    verify_email_otp,
    set_httponly_auth_cookies,
    clear_httponly_auth_cookies,
    get_current_user_from_cookie,
    normalize_email,
)
from app.services.email_service import send_email_otp

router = APIRouter(prefix="/auth", tags=["Authentication & OTP"])

# WhatsApp Meta API OTP Endpoints
@router.post("/send-whatsapp-otp")
async def send_whatsapp_otp_endpoint(req: SendOTPRequest):
    if not req.phone or len(req.phone.strip()) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number provided.")

    otp, err = generate_secure_otp(req.phone)
    if err:
        raise HTTPException(status_code=429, detail=err)

    success, msg = await send_whatsapp_message(req.phone, otp)
    if not success:
        raise HTTPException(status_code=500, detail=msg)

    norm = normalize_phone_number(req.phone)
    return {
        "status": "success",
        "message": f"WhatsApp verification code sent to {norm}.",
        "expires_in_seconds": 300
    }

@router.post("/verify-whatsapp-otp")
async def verify_whatsapp_otp_endpoint(req: VerifyOTPRequest):
    is_valid, msg, token = verify_otp_and_issue_token(req.phone, req.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    return {
        "status": "success",
        "message": msg,
        "verification_token": token,
        "expires_in_seconds": 900
    }

# Email OTP & HTTP-Only Cookie Authentication Endpoints
@router.post("/email/send-otp")
async def send_email_otp_endpoint(req: SendEmailOTPRequest):
    norm_email = normalize_email(req.email)
    if not norm_email or "@" not in norm_email or "." not in norm_email:
        raise HTTPException(status_code=400, detail="Invalid email address provided.")

    otp, err = generate_email_otp(norm_email)
    if err:
        raise HTTPException(status_code=429, detail=err)

    success, msg = send_email_otp(norm_email, otp)
    if not success:
        return {
            "status": "pending_smtp_credentials",
            "message": msg,
            "generated_otp_debug": otp,
            "expires_in_seconds": 300
        }

    return {
        "status": "success",
        "message": f"6-digit verification code sent to {norm_email}.",
        "expires_in_seconds": 300
    }

@router.post("/email/verify-otp")
async def verify_email_otp_endpoint(req: VerifyEmailOTPRequest, response: Response):
    norm_email = normalize_email(req.email)
    is_valid, msg = verify_email_otp(norm_email, req.otp)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    set_httponly_auth_cookies(response, email=norm_email, role="ADMIN", is_vercel_prod=True)

    return {
        "status": "success",
        "message": "Authentication successful! HTTP-Only session cookies established.",
        "user": {
            "email": norm_email,
            "role": "ADMIN"
        }
    }

@router.get("/me")
async def get_current_user_profile(user: dict = Depends(get_current_user_from_cookie)):
    return {
        "status": "authenticated",
        "user": user
    }

@router.post("/logout")
async def logout_endpoint(response: Response):
    clear_httponly_auth_cookies(response, is_vercel_prod=True)
    return {"status": "success", "message": "Successfully logged out. Session cookies cleared."}
