import os
import sys
import shutil
import subprocess
import platform

def build_sidecar():
    print("=" * 60)
    print("BUILDING FASTAPI SIDECAR EXECUTABLE VIA PYINSTALLER")
    print("=" * 60)

    api_root = os.path.dirname(os.path.abspath(__file__))
    main_py = os.path.join(api_root, "main.py")
    dist_dir = os.path.join(api_root, "dist")
    build_dir = os.path.join(api_root, "build")
    
    # Destination in src-tauri
    tauri_binaries_dir = os.path.abspath(os.path.join(api_root, "..", "pos", "src-tauri", "binaries"))
    os.makedirs(tauri_binaries_dir, exist_ok=True)

    # 0. Compile high-security Python modules into native C binaries (.pyd) via Cython
    try:
        from compile_native import compile_modules
        print("[Security Hardening] Compiling critical modules to native C machine code (.pyd)...")
        compile_modules()
    except Exception as cy_err:
        print(f"[Notice] Cython native compilation warning: {cy_err}")

    # Determine target triple
    target_triple = "x86_64-pc-windows-msvc"
    try:
        rustc_out = subprocess.check_output(["rustc", "-vV"], text=True)
        for line in rustc_out.splitlines():
            if line.startswith("host:"):
                target_triple = line.split(":", 1)[1].strip()
                break
    except Exception as e:
        print(f"Notice: Could not query rustc for target triple ({e}), defaulting to {target_triple}")

    print(f"Target Triple: {target_triple}")
    print(f"Target Output Folder: {tauri_binaries_dir}")

    # PyInstaller arguments
    hidden_imports = [
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "asyncpg",
        "asyncpg.pgproto",
        "asyncpg.pgproto.pgproto",
        "pydantic",
        "sqlite3",
        "sqlcipher3",
        "app",
        "app.core",
        "app.core.database",
        "app.core.paths",
        "app.core.ai_security",
        "app.core.sanitizer",
        "app.routers",
        "app.routers.catalog",
        "app.routers.auth",
        "app.routers.employees",
        "app.routers.billing",
        "app.routers.admin",
        "app.routers.printer",
        "app.routers.ai",
        "app.services",
        "app.services.sqlite_sync_service",
        "app.services.backup_service",
        "app.services.rolling_backup_service",
        "app.services.migration_service",
        "app.services.print_queue_service",
        "app.services.ai_service",
        "app.services.odoo_service",
        "app.services.printer_service",
        "app.models",
        "app.models.db1_catalog",
        "app.models.db2_operations",
        "app.models.db3_finance",
        "app.schemas",
        "app.schemas.ai",
        "app.schemas.auth",
        "app.schemas.employee",
        "app.schemas.product",
    ]

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--name=api",
        "--clean",
        "--noconfirm",
        "--onefile",
        "--collect-all=sqlcipher3",
        f"--paths={api_root}",
        f"--distpath={dist_dir}",
        f"--workpath={build_dir}",
    ]

    for hi in hidden_imports:
        cmd.extend(["--hidden-import", hi])

    cmd.append(main_py)

    print("Executing PyInstaller command...")
    result = subprocess.run(cmd, cwd=api_root)
    if result.returncode != 0:
        print("ERROR: PyInstaller build failed!")
        sys.exit(result.returncode)

    built_exe = os.path.join(dist_dir, "api.exe" if sys.platform == "win32" else "api")
    if not os.path.exists(built_exe):
        print(f"ERROR: Expected binary not found at {built_exe}")
        sys.exit(1)

    # Copy to target-triple-suffixed name for Tauri bundler
    target_exe_name = f"api-{target_triple}.exe" if sys.platform == "win32" else f"api-{target_triple}"
    dest_path = os.path.join(tauri_binaries_dir, target_exe_name)
    shutil.copy2(built_exe, dest_path)
    print(f"SUCCESS: Copied sidecar binary to {dest_path}")

    # Also copy generic fallback names (e.g. for dev and 32-bit fallback)
    if sys.platform == "win32":
        shutil.copy2(built_exe, os.path.join(tauri_binaries_dir, "api.exe"))
        shutil.copy2(built_exe, os.path.join(tauri_binaries_dir, "api-i686-pc-windows-msvc.exe"))

    print("Sidecar bundling complete.")

if __name__ == "__main__":
    build_sidecar()
