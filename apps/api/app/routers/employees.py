import uuid
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

@router.post("/sync-odoo/employees")
async def sync_employees_from_odoo():
    """Syncs ONLY Employee/Staff data from Odoo ERP into DB2 Operations."""
    res = await sync_odoo_employees()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message"))
    return res

@router.get("/employees")
async def get_employees(db: AsyncSession = Depends(get_db2)):
    local_emps = get_all_local_employees()
    local_map = {}
    for le in local_emps:
        local_map[le["id"]] = {
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

    if db is not None:
        try:
            result = await db.execute(select(EmployeeModel))
            rows = result.scalars().all()
            if rows:
                for r in rows:
                    try:
                        save_employee_locally(
                            emp_id=r.id, odoo_id=None, name=r.name,
                            job_title=r.role, department=None,
                            phone=r.phone, email=None
                        )
                    except Exception:
                        pass
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
        except Exception as e:
            print(f"DB2 offline ({e}), loading employees from SQLite...")

    return list(local_map.values())


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
            return {"message": "Employee deleted from local SQLite"}
        await db.delete(db_emp)
        await db.commit()
        return {"message": "Employee deleted from DB2 and SQLite"}
    except Exception as e:
        print(f"DB2 offline ({e}). Employee deleted from local SQLite only.")
        return {"message": "Employee deleted from local SQLite (DB2 offline)"}

