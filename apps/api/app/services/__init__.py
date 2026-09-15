from app.services.odoo_service import sync_all_odoo_products, fetch_odoo_company_settings
from app.services.auth_service import (
    generate_email_otp,
    verify_email_otp,
    set_httponly_auth_cookies,
    clear_httponly_auth_cookies,
    get_current_user_from_cookie,
    normalize_email,
)
from app.services.email_service import send_email_otp
from app.services.whatsapp_service import (
    generate_secure_otp,
    send_whatsapp_message,
    verify_otp_and_issue_token,
    normalize_phone_number,
)
from app.services.pos_service import POSCheckoutRequest, calculate_pos_receipt
from app.services.storage_service import upload_product_image_with_fallback

__all__ = [
    "sync_all_odoo_products",
    "fetch_odoo_company_settings",
    "generate_email_otp",
    "verify_email_otp",
    "set_httponly_auth_cookies",
    "clear_httponly_auth_cookies",
    "get_current_user_from_cookie",
    "normalize_email",
    "send_email_otp",
    "generate_secure_otp",
    "send_whatsapp_message",
    "verify_otp_and_issue_token",
    "normalize_phone_number",
    "POSCheckoutRequest",
    "calculate_pos_receipt",
    "upload_product_image_with_fallback",
]
