import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / "apps" / "api"))

from database import SessionDb1, SessionDb2, SessionDb3
from sqlalchemy import text

async def check():
    query = text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")

    async with SessionDb1() as db1:
        res = await db1.execute(query)
        print("DB1 Tables:", sorted([r[0] for r in res.fetchall()]))

    async with SessionDb2() as db2:
        res = await db2.execute(query)
        print("DB2 Tables:", sorted([r[0] for r in res.fetchall()]))

    async with SessionDb3() as db3:
        res = await db3.execute(query)
        print("DB3 Tables:", sorted([r[0] for r in res.fetchall()]))

if __name__ == "__main__":
    asyncio.run(check())
