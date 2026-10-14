import os
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

from app.core.paths import get_app_data_dir

# Locate .env file across standard installation and development locations
env_candidates = [
    Path(get_app_data_dir()) / ".env",
    Path(sys.executable).parent / ".env",
    Path.cwd() / ".env",
]
for level in [3, 2, 4, 1]:
    try:
        env_candidates.append(Path(__file__).resolve().parents[level] / ".env")
    except Exception:
        pass

for candidate in env_candidates:
    if candidate.exists():
        load_dotenv(dotenv_path=str(candidate), override=True)
        break

def get_async_url(key: str) -> str:
    url = os.getenv(key) or os.getenv("DATABASE_URL") or ""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://")
    return url

# 3 Engines for DB1, DB2, and DB3
url_db1 = get_async_url("DB1_DATABASE_URL")
url_db2 = get_async_url("DB2_DATABASE_URL")
url_db3 = get_async_url("DB3_DATABASE_URL")

def create_safe_async_engine(url: str):
    if not url or not url.strip():
        return None
    try:
        return create_async_engine(
            url,
            echo=False,
            future=True,
            pool_pre_ping=False,
            pool_recycle=300,
            pool_timeout=1.5,
            connect_args={"timeout": 1.5, "command_timeout": 2}
        )
    except Exception as e:
        print(f"Notice: Could not initialize async engine for {url[:15]}... ({e}). Operating in local SQLite mode.")
        return None

engine_db1 = create_safe_async_engine(url_db1)
engine_db2 = create_safe_async_engine(url_db2)
engine_db3 = create_safe_async_engine(url_db3)

# 3 Session Makers (None when cloud database is not configured)
SessionDb1 = async_sessionmaker(engine_db1, class_=AsyncSession, expire_on_commit=False) if engine_db1 else None
SessionDb2 = async_sessionmaker(engine_db2, class_=AsyncSession, expire_on_commit=False) if engine_db2 else None
SessionDb3 = async_sessionmaker(engine_db3, class_=AsyncSession, expire_on_commit=False) if engine_db3 else None

# Isolated Base Metadata per Database
Base1 = declarative_base() # DB1: Catalog, Orders, Users
Base2 = declarative_base() # DB2: Employees & Payroll
Base3 = declarative_base() # DB3: Billing, Khata, Purchases, Analytics

Base = Base1

# FastAPI Dependencies with Fail-Safe Offline Fallback
async def get_db1():
    if not SessionDb1:
        yield None
        return
    try:
        async with SessionDb1() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB1 offline ({e}). Using local SQLite mode.")
        yield None

async def get_db2():
    if not SessionDb2:
        yield None
        return
    try:
        async with SessionDb2() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB2 offline ({e}). Using local SQLite mode.")
        yield None

async def get_db3():
    if not SessionDb3:
        yield None
        return
    try:
        async with SessionDb3() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB3 offline ({e}). Using local SQLite mode.")
        yield None

get_db = get_db1
SessionLocal = SessionDb1
engine = engine_db1
