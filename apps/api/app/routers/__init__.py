from app.routers.catalog import router as catalog_router
from app.routers.auth import router as auth_router
from app.routers.employees import router as employees_router
from app.routers.billing import router as billing_router
from app.routers.admin import router as admin_router

__all__ = [
    "catalog_router",
    "auth_router",
    "employees_router",
    "billing_router",
    "admin_router",
]
