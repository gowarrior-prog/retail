import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "api"))

import json
from app.services.sqlite_sync_service import get_all_local_products


prods = get_all_local_products()
print(f"Total SQLite Products: {len(prods)}")
if prods:
    print("Sample Product Keys:", list(prods[0].keys()))
    print("Sample Product Data:", prods[0])
