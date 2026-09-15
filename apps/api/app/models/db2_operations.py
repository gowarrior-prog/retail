from sqlalchemy import Column, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from app.core.database import Base2

class EmployeeModel(Base2):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    cnic = Column(String, unique=True, nullable=True)
    role = Column(String, default="SALES_EXECUTIVE")
    base_salary = Column(Float, nullable=False)
    is_deleted = Column(Boolean, default=False)
    
    # Embedded Attendance Tracking
    attendance_status = Column(String, default="PRESENT")
    attendance_notes = Column(String, nullable=True)
    last_attendance_date = Column(DateTime(timezone=True), nullable=True)

    # Embedded Leave Tracking
    leave_status = Column(String, default="NONE")
    leave_reason = Column(String, nullable=True)
    leave_start_date = Column(DateTime(timezone=True), nullable=True)
    leave_end_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now(), onupdate=func.now())

class SalaryPayoutModel(Base2):
    __tablename__ = "salary_payouts"

    id = Column(String, primary_key=True, index=True)
    employee_id = Column(String, nullable=False)
    month = Column(String, nullable=False)
    amount_paid = Column(Float, nullable=False)
    bonus = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    paid_at = Column(DateTime(timezone=True), server_default=func.now(), default=func.now())
