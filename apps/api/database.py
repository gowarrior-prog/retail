import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

# Single root .env file path
root_env = Path(__file__).resolve().parents[1] / ".env"
if not root_env.exists():
    root_env = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=root_env)

def get_async_url(key: str) -> str:
    url = os.getenv(key) or os.getenv("DATABASE_URL") or ""
    return url.replace("postgresql://", "postgresql+asyncpg://")

# 3 Engines for 3 Supabase projects
url_db1 = get_async_url("DB1_DATABASE_URL")
url_db2 = get_async_url("DB2_DATABASE_URL")
url_db3 = get_async_url("DB3_DATABASE_URL")

engine_db1 = create_async_engine(url_db1, echo=False, future=True)
engine_db2 = create_async_engine(url_db2, echo=False, future=True)
engine_db3 = create_async_engine(url_db3, echo=False, future=True)

# 3 Session Makers
SessionDb1 = async_sessionmaker(engine_db1, class_=AsyncSession, expire_on_commit=False)
SessionDb2 = async_sessionmaker(engine_db2, class_=AsyncSession, expire_on_commit=False)
SessionDb3 = async_sessionmaker(engine_db3, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

# FastAPI Dependencies
async def get_db1():
    async with SessionDb1() as session:
        yield session

async def get_db2():
    async with SessionDb2() as session:
        yield session

async def get_db3():
    async with SessionDb3() as session:
        yield session

# Alias for default
get_db = get_db1
SessionLocal = SessionDb1
engine = engine_db1