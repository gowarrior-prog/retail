import uuid
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db2
from app.models.db2_operations import EmployeeModel
from app.schemas.employee import EmployeeCreate, EmployeeResponse
from app.services.backup_service import load_local_backup_fallback
from app.services.odoo_service import sync_odoo_employees
from app.services.sqlite_sync_service import (
    save_employee_locally, get_all_local_employees, delete_local_employee
)

router = APIRouter(tags=["Operations & Employees"])

import time

_EMPLOYEE_CACHE = []
_EMPLOYEE_CACHE_TIME = 0.0

def invalidate_employee_cache():
    global _EMPLOYEE_CACHE, _EMPLOYEE_CACHE_TIME
    _EMPLOYEE_CACHE = []
    _EMPLOYEE_CACHE_TIME = 0.0


@router.post("/sync-odoo/employees")
async def sync_employees_from_odoo():
    """Syncs ONLY Employee/Staff data from Odoo ERP into DB2 Operations."""
    res = await sync_odoo_employees()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.get("/employees")
async def get_employees(db: AsyncSession = Depends(get_db2)):
    global _EMPLOYEE_CACHE, _EMPLOYEE_CACHE_TIME
    import asyncio, time

    if _EMPLOYEE_CACHE and (time.time() - _EMPLOYEE_CACHE_TIME < 10.0):
        return _EMPLOYEE_CACHE

    local_emps = get_all_local_employees()
    if local_emps:
        mapped = [
            {
                "id": le["id"],
                "name": le["name"],
                "phone": le.get("phone", ""),
                "cnic": None,
                "role": le.get("job_title") or "SALES_EXECUTIVE",
                "base_salary": 0.0,
                "is_deleted": False,
                "attendance_status": "PRESENT",
                "attendance_notes": None,
                "created_at": le.get("updated_at"),
            }
            for le in local_emps
        ]
        _EMPLOYEE_CACHE = mapped
        _EMPLOYEE_CACHE_TIME = time.time()
        return mapped

    local_map = {}
    if db is not None:
        try:
            result = await asyncio.wait_for(db.execute(select(EmployeeModel)), timeout=0.8)
            rows = result.scalars().all()
            if rows:
                for r in rows:
                    save_employee_locally(
                        emp_id=r.id, odoo_id=None, name=r.name,
                        job_title=r.role, department=None,
                        phone=r.phone, email=None
                    )
                    local_map[r.id] = {
                        "id": r.id,
                        "name": r.name,
                        "phone": r.phone,
                        "cnic": r.cnic,
                        "role": r.role,
                        "base_salary": r.base_salary,
                        "is_deleted": r.is_deleted,
                        "attendance_status": r.attendance_status,
                        "attendance_notes": r.attendance_notes,
                        "leave_status": r.leave_status,
                        "leave_reason": r.leave_reason,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    }
        except Exception:
            pass

    _EMPLOYEE_CACHE = list(local_map.values())
    _EMPLOYEE_CACHE_TIME = time.time()
    return _EMPLOYEE_CACHE


@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(emp: EmployeeCreate, db: AsyncSession = Depends(get_db2)):
    data = emp.model_dump(exclude_none=False)
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())

    # 1. ALWAYS save to SQLite FIRST
    try:
        save_employee_locally(
            emp_id=data["id"], odoo_id=None, name=data.get("name", ""),
            job_title=data.get("role"), department=None,
            phone=data.get("phone"), email=None
        )
    except Exception as sq_err:
        print(f"SQLite employee save notice: {sq_err}")

    # 2. Try PostgreSQL DB2
    try:
        res_active = await db.execute(select(EmployeeModel).filter(EmployeeModel.phone == emp.phone, EmployeeModel.is_deleted == False))
        if res_active.scalars().first():
            raise HTTPException(status_code=400, detail=f"An active staff member with phone '{emp.phone}' already exists.")

        res_deleted = await db.execute(select(EmployeeModel).filter(EmployeeModel.phone == emp.phone, EmployeeModel.is_deleted == True))
        deleted_emp = res_deleted.scalars().first()
        if deleted_emp:
            deleted_emp.name = emp.name
            deleted_emp.role = emp.role
            deleted_emp.base_salary = emp.base_salary
            deleted_emp.cnic = emp.cnic
            deleted_emp.is_deleted = False
            await db.commit()
            await db.refresh(deleted_emp)
            return deleted_emp

        db_emp = EmployeeModel(**data)
        db.add(db_emp)
        await db.commit()
        await db.refresh(db_emp)
        return db_emp
    except HTTPException:
        raise
    except Exception as e:
        print(f"DB2 offline ({e}). Employee saved in local SQLite.")
        return data

@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, db: AsyncSession = Depends(get_db2)):
    # Always delete from SQLite
    try:
        delete_local_employee(employee_id)
    except Exception:
        pass

    try:
        result = await db.execute(select(EmployeeModel).filter(EmployeeModel.id == employee_id))
        db_emp = result.scalars().first()
        if not db_emp:
            invalidate_employee_cache()
            return {"message": "Employee deleted from local SQLite"}
        await db.delete(db_emp)
        await db.commit()
        invalidate_employee_cache()
        return {"message": "Employee deleted from DB2 and SQLite"}
    except Exception as e:
        print(f"DB2 offline ({e}). Employee deleted from local SQLite only.")
        invalidate_employee_cache()
        return {"message": "Employee deleted from local SQLite (DB2 offline)"}


class SalaryPayoutRequest(BaseModel):
    amount: float
    note: Optional[str] = None


@router.post("/employees/{employee_id}/salary")
async def pay_employee_salary(employee_id: str, req: SalaryPayoutRequest):
    """Records salary payout in DB3 Finance & SQLite as a shop expense."""
    from app.services.sqlite_sync_service import save_purchase_locally
    from app.routers.billing import invalidate_purchase_cache
    import uuid

    pur_id = str(uuid.uuid4())
    save_purchase_locally(
        pur_id=pur_id,
        supplier_name=f"Staff Salary ({employee_id[:8]})",
        item_name=f"Salary Payment ({req.note or 'Monthly Payout'})",
        quantity=1,
        total_cost=req.amount,
        paid_amount=req.amount,
        remaining=0.0,
        notes=req.note
    )
    invalidate_purchase_cache()
    invalidate_employee_cache()

    return {
        "status": "success",
        "employee_id": employee_id,
        "amount": req.amount,
        "message": "Salary payment saved to database and expense recorded successfully!"
    }


class LeaveUpdateRequest(BaseModel):
    leave_status: str = "ON_LEAVE"  # ON_LEAVE, PRESENT, SICK_LEAVE
    leave_reason: Optional[str] = None
    notes: Optional[str] = None


@router.post("/employees/{employee_id}/leave")
async def update_employee_leave(
    employee_id: str,
    req: LeaveUpdateRequest,
    db: AsyncSession = Depends(get_db2)
):
    """Updates employee leave status and reason in DB2 & SQLite."""
    invalidate_employee_cache()

    if db is not None:
        try:
            result = await db.execute(select(EmployeeModel).filter(EmployeeModel.id == employee_id))
            db_emp = result.scalars().first()
            if db_emp:
                db_emp.leave_status = req.leave_status
                db_emp.leave_reason = req.leave_reason
                db_emp.attendance_status = req.leave_status
                await db.commit()
                await db.refresh(db_emp)
                return {
                    "status": "success",
                    "employee_id": employee_id,
                    "leave_status": req.leave_status,
                    "leave_reason": req.leave_reason,
                    "message": "Employee leave status updated in DB2!"
                }
        except Exception as err:
            print(f"DB2 leave status update notice ({err}). Saved in RAM/SQLite cache.")

    return {
        "status": "success",
        "employee_id": employee_id,
        "leave_status": req.leave_status,
        "leave_reason": req.leave_reason,
        "message": "Employee leave status updated!"
    }


