import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db2
from app.models.db2_operations import EmployeeModel
from app.schemas.employee import EmployeeCreate, EmployeeResponse
from app.services.backup_service import load_local_backup_fallback
from app.services.odoo_service import sync_odoo_employees

router = APIRouter(tags=["Operations & Employees"])

@router.post("/sync-odoo/employees")
async def sync_employees_from_odoo():
    """Syncs ONLY Employee/Staff data from Odoo ERP into DB2 Operations."""
    res = await sync_odoo_employees()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.get("/employees")
async def get_employees(db: AsyncSession = Depends(get_db2)):
    try:
        result = await db.execute(select(EmployeeModel))
        rows = result.scalars().all()
        return [
            {
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
            for r in rows
        ]
    except Exception as e:
        print(f"Database error ({e}), reading employees from local hard drive JSON backup...")
        fallback = load_local_backup_fallback("employees")
        if fallback:
            return fallback
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(emp: EmployeeCreate, db: AsyncSession = Depends(get_db2)):
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

    try:
        data = emp.model_dump(exclude_none=False)
        if not data.get("id"):
            data["id"] = str(uuid.uuid4())
        db_emp = EmployeeModel(**data)
        db.add(db_emp)
        await db.commit()
        await db.refresh(db_emp)
        return db_emp
    except Exception as e:
        await db.rollback()
        err_msg = str(e)
        if "UniqueViolationError" in err_msg or "unique constraint" in err_msg:
            if "employees_phone_key" in err_msg:
                raise HTTPException(status_code=400, detail=f"Phone number '{emp.phone}' is already registered to another staff member.")
            if "employees_cnic_key" in err_msg:
                raise HTTPException(status_code=400, detail=f"CNIC '{emp.cnic}' is already registered.")
            raise HTTPException(status_code=400, detail="Duplicate staff details provided.")
        raise HTTPException(status_code=400, detail=f"Failed to create employee: {err_msg}")

@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, db: AsyncSession = Depends(get_db2)):
    result = await db.execute(select(EmployeeModel).filter(EmployeeModel.id == employee_id))
    db_emp = result.scalars().first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    await db.delete(db_emp)
    await db.commit()
    return {"message": "Employee permanently deleted from DB2 successfully"}
