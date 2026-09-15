from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import text
from app.core.database import SessionDb1, SessionDb2, SessionDb3

router = APIRouter(prefix="/admin", tags=["Super Admin Maintenance"])

@router.delete("/purge-table")
async def super_admin_purge_table(
    target_db: str = Query(..., description="db1, db2, or db3"),
    table_name: str = Query(..., description="Exact table name to purge e.g. products, employees, billing_history"),
    admin_secret: str = Query(..., description="Super Admin authorization key")
):
    if admin_secret != "SUPER_ADMIN_SECRET_KEY":
        raise HTTPException(status_code=403, detail="Unauthorized Super Admin access")

    session_map = {
        "db1": SessionDb1,
        "db2": SessionDb2,
        "db3": SessionDb3
    }
    if target_db.lower() not in session_map:
        raise HTTPException(status_code=400, detail="Invalid target_db. Must be db1, db2, or db3.")

    SessionClass = session_map[target_db.lower()]
    async with SessionClass() as db:
        try:
            await db.execute(text(f'TRUNCATE TABLE "{table_name}" CASCADE;'))
            await db.commit()
            return {"message": f"Successfully purged table '{table_name}' in '{target_db}'."}
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to purge table: {str(e)}")
