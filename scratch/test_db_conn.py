import sys
import os
import asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

from app.core.database import SessionDb1, SessionDb2, SessionDb3
from sqlalchemy import text

async def main():
    print("Testing DB1 connection...")
    try:
        async with SessionDb1() as s1:
            res = await s1.execute(text("SELECT 1"))
            print("DB1 Connected OK:", res.scalar())
    except Exception as e:
        print("DB1 Connection Failed:", e)

    print("\nTesting DB2 connection...")
    try:
        async with SessionDb2() as s2:
            res = await s2.execute(text("SELECT 1"))
            print("DB2 Connected OK:", res.scalar())
    except Exception as e:
        print("DB2 Connection Failed:", e)

    print("\nTesting DB3 connection...")
    try:
        async with SessionDb3() as s3:
            res = await s3.execute(text("SELECT 1"))
            print("DB3 Connected OK:", res.scalar())
    except Exception as e:
        print("DB3 Connection Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
