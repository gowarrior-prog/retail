from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.sanitizer import sanitize_text, sanitize_phone

class EmployeeCreate(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    cnic: Optional[str] = None
    role: Optional[str] = "SALES_EXECUTIVE"
    base_salary: float
    attendance_status: Optional[str] = "PRESENT"
    attendance_notes: Optional[str] = None

    @field_validator("name", "role", "attendance_notes", mode="before")
    @classmethod
    def sanitize_string_fields(cls, v):
        return sanitize_text(v) if isinstance(v, str) else v

    @field_validator("phone", "cnic", mode="before")
    @classmethod
    def sanitize_phone_fields(cls, v):
        return sanitize_phone(v) if isinstance(v, str) else v

class EmployeeResponse(BaseModel):
    id: str
    name: str
    phone: str
    cnic: Optional[str] = None
    role: str
    base_salary: float
    is_deleted: bool = False
    attendance_status: Optional[str] = "PRESENT"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
