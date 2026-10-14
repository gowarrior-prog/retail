import os
import sys
import shutil

APP_IDENTIFIER = "com.bilalcloth.pos"

def get_app_data_dir() -> str:
    """
    Returns the secure, writable application data directory for the current OS.
    Ensures read/write permissions are guaranteed across any Windows, Mac, or Linux PC.
    """
    # 1. Explicit override via Environment Variable (e.g. passed from Tauri or CLI)
    env_dir = os.getenv("POS_DATA_DIR") or os.getenv("TAURI_APP_DATA_DIR")
    if env_dir and env_dir.strip():
        data_dir = os.path.abspath(env_dir.strip())
        os.makedirs(data_dir, exist_ok=True)
        return data_dir

    # 2. Windows: %APPDATA%/com.bilalcloth.pos (e.g. C:\\Users\\<user>\\AppData\\Roaming\\com.bilalcloth.pos)
    if sys.platform == "win32":
        base = os.getenv("APPDATA") or os.getenv("LOCALAPPDATA")
        if not base:
            user_profile = os.getenv("USERPROFILE") or os.path.expanduser("~")
            base = os.path.join(user_profile, "AppData", "Roaming")
        data_dir = os.path.join(base, APP_IDENTIFIER)
    # 3. macOS: ~/Library/Application Support/com.bilalcloth.pos
    elif sys.platform == "darwin":
        data_dir = os.path.expanduser(f"~/Library/Application Support/{APP_IDENTIFIER}")
    # 4. Linux: ~/.local/share/com.bilalcloth.pos or $XDG_DATA_HOME/com.bilalcloth.pos
    else:
        xdg = os.getenv("XDG_DATA_HOME") or os.path.expanduser("~/.local/share")
        data_dir = os.path.join(xdg, APP_IDENTIFIER)

    os.makedirs(data_dir, exist_ok=True)
    return data_dir

def get_sqlite_path() -> str:
    """
    Returns the absolute path to pos_local.db inside the system app data directory.
    If the target database does not exist yet, it automatically migrates any existing
    database from legacy developer folders so existing data is preserved.
    """
    data_dir = get_app_data_dir()
    target_db = os.path.join(data_dir, "pos_local.db")

    # Migration check: if target doesn't exist, check legacy local folders
    if not os.path.exists(target_db):
        candidates = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "pos_local.db"),
            os.path.join(os.getcwd(), "data", "pos_local.db"),
            os.path.join(os.getcwd(), "pos_local.db"),
        ]
        for cand in candidates:
            if os.path.exists(cand) and os.path.getsize(cand) > 0:
                try:
                    shutil.copy2(cand, target_db)
                    print(f"[SQLite Migration] Migrated existing database from {cand} to {target_db}")
                    break
                except Exception as e:
                    print(f"[SQLite Migration Notice] Could not copy {cand}: {e}")

    return target_db
