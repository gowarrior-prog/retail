from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class EmployeeCreate(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    cnic: Optional[str] = None
    role: Optional[str] = "SALES_EXECUTIVE"
    base_salary: float
    attendance_status: Optional[str] = "PRESENT"
    attendance_notes: Optional[str] = None

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
