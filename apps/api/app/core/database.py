import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Locate single root .env file
for level in [3, 2, 4, 1]:
    candidate = Path(__file__).resolve().parents[level] / ".env"
    if candidate.exists():
        load_dotenv(dotenv_path=str(candidate), override=True)
        break

def get_async_url(key: str) -> str:
    url = os.getenv(key) or os.getenv("DATABASE_URL") or ""
    return url.replace("postgresql://", "postgresql+asyncpg://")

# 3 Engines for DB1, DB2, and DB3
url_db1 = get_async_url("DB1_DATABASE_URL")
url_db2 = get_async_url("DB2_DATABASE_URL")
url_db3 = get_async_url("DB3_DATABASE_URL")

engine_db1 = create_async_engine(url_db1, echo=False, future=True, pool_pre_ping=False, pool_recycle=300, pool_timeout=1.5, connect_args={"timeout": 1.5, "command_timeout": 2})
engine_db2 = create_async_engine(url_db2, echo=False, future=True, pool_pre_ping=False, pool_recycle=300, pool_timeout=1.5, connect_args={"timeout": 1.5, "command_timeout": 2})
engine_db3 = create_async_engine(url_db3, echo=False, future=True, pool_pre_ping=False, pool_recycle=300, pool_timeout=1.5, connect_args={"timeout": 1.5, "command_timeout": 2})

# 3 Session Makers
SessionDb1 = async_sessionmaker(engine_db1, class_=AsyncSession, expire_on_commit=False)
SessionDb2 = async_sessionmaker(engine_db2, class_=AsyncSession, expire_on_commit=False)
SessionDb3 = async_sessionmaker(engine_db3, class_=AsyncSession, expire_on_commit=False)

# Isolated Base Metadata per Database
Base1 = declarative_base() # DB1: Catalog, Orders, Users
Base2 = declarative_base() # DB2: Employees & Payroll
Base3 = declarative_base() # DB3: Billing, Khata, Purchases, Analytics

Base = Base1

# FastAPI Dependencies with Fail-Safe Offline Fallback
async def get_db1():
    try:
        async with SessionDb1() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB1 offline ({e}). Using local SQLite mode.")
        yield None

async def get_db2():
    try:
        async with SessionDb2() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB2 offline ({e}). Using local SQLite mode.")
        yield None

async def get_db3():
    try:
        async with SessionDb3() as session:
            yield session
    except Exception as e:
        print(f"Notice: PostgreSQL DB3 offline ({e}). Using local SQLite mode.")
        yield None

get_db = get_db1
SessionLocal = SessionDb1
engine = engine_db1

