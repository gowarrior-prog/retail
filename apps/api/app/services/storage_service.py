import io
import os
import uuid
from PIL import Image

SUPABASE_URL_1 = os.getenv("SUPABASE_URL_1", "")
SUPABASE_KEY_1 = os.getenv("SUPABASE_SERVICE_KEY_1", "")

SUPABASE_URL_2 = os.getenv("SUPABASE_URL_2", "")
SUPABASE_KEY_2 = os.getenv("SUPABASE_SERVICE_KEY_2", "")

def get_supabase_client(url: str, key: str):
    if url and key:
        try:
            from supabase import create_client
            return create_client(url, key)
        except Exception as e:
            print(f"Error initializing Supabase client for {url}: {e}")
    return None

def convert_to_webp(image_bytes: bytes, quality: int = 80) -> bytes:
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGBA")
    else:
        image = image.convert("RGB")

    output_buffer = io.BytesIO()
    image.save(output_buffer, format="WEBP", quality=quality, optimize=True)
    return output_buffer.getvalue()

async def upload_product_image_with_fallback(file_bytes: bytes, filename: str = "") -> dict:
    webp_bytes = convert_to_webp(file_bytes)
    unique_name = f"{uuid.uuid4().hex}.webp"
    
    client_1 = get_supabase_client(SUPABASE_URL_1, SUPABASE_KEY_1)
    if client_1:
        try:
            res = client_1.storage.from_("product-images").upload(
                file=webp_bytes,
                path=unique_name,
                file_options={"content-type": "image/webp"}
            )
            public_url = client_1.storage.from_("product-images").get_public_url(unique_name)
            return {
                "status": "success",
                "bucket": "DB1_STORAGE",
                "url": public_url
            }
        except Exception as e1:
            print(f"DB1 Storage upload failed ({e1}), falling back to DB2 Storage...")

    client_2 = get_supabase_client(SUPABASE_URL_2, SUPABASE_KEY_2)
    if client_2:
        try:
            res = client_2.storage.from_("product-images-backup").upload(
                file=webp_bytes,
                path=unique_name,
                file_options={"content-type": "image/webp"}
            )
            public_url = client_2.storage.from_("product-images-backup").get_public_url(unique_name)
            return {
                "status": "success",
                "bucket": "DB2_STORAGE_FALLBACK",
                "url": public_url
            }
        except Exception as e2:
            print(f"DB2 Storage upload also failed: {e2}")

    return {
        "status": "error",
        "message": "Storage buckets unconfigured or unreachable.",
        "fallback_local": f"/uploads/{unique_name}"
    }
