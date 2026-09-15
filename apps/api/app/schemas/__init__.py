from app.schemas.product import ProductCreate, ProductResponse
from app.schemas.employee import EmployeeCreate, EmployeeResponse
from app.schemas.auth import (
    UserCreate,
    UserResponse,
    SendOTPRequest,
    VerifyOTPRequest,
    SendEmailOTPRequest,
    VerifyEmailOTPRequest,
)

__all__ = [
    "ProductCreate",
    "ProductResponse",
    "EmployeeCreate",
    "EmployeeResponse",
    "UserCreate",
    "UserResponse",
    "SendOTPRequest",
    "VerifyOTPRequest",
    "SendEmailOTPRequest",
    "VerifyEmailOTPRequest",
]
