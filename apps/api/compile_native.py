"""
Native Cython Compilation & Obfuscation Engine for Bilal Cloth POS:
- Compiles sensitive Python modules into native C machine code (.pyd on Windows / .so on Linux).
- Protects intellectual property, SQLCipher database encryption keys, and AI security logic
  against reverse-engineering, decompilation (pyinstxtractor, pycdc, uncompyle6), and memory dumping.
- Produces optimized native shared libraries.
"""

import os
import sys
import shutil
import glob
from setuptools import setup, Extension
from Cython.Build import cythonize

API_ROOT = os.path.dirname(os.path.abspath(__file__))

# Critical security modules to compile to native C binary
MODULES_TO_COMPILE = [
    os.path.join(API_ROOT, "app", "core", "sanitizer.py"),
    os.path.join(API_ROOT, "app", "core", "ai_security.py"),
    os.path.join(API_ROOT, "app", "services", "sqlite_sync_service.py"),
]

def compile_modules():
    print("=" * 70)
    print("CYTHON NATIVE C-BINARY COMPILATION & OBFUSCATION")
    print("=" * 70)

    existing_files = [f for f in MODULES_TO_COMPILE if os.path.exists(f)]
    if not existing_files:
        print("Error: No target security modules found to compile.")
        return False

    files_to_build = []
    for src in existing_files:
        src_dir = os.path.dirname(src)
        base = os.path.splitext(os.path.basename(src))[0]
        pyd_matches = glob.glob(os.path.join(src_dir, f"{base}.*.pyd"))
        if pyd_matches and all(os.path.getmtime(p) >= os.path.getmtime(src) for p in pyd_matches):
            print(f"  [Up-to-date] {os.path.relpath(src, API_ROOT)} (Native .pyd binary already present)")
            continue
        files_to_build.append(src)

    if not files_to_build:
        print("\n[SUCCESS] All native .pyd binary extensions are already built and up-to-date!")
        return True

    print(f"\nCompiling {len(files_to_build)} modified modules to native C binaries:")
    for f in files_to_build:
        print(f"  -> {os.path.relpath(f, API_ROOT)}")

    # Cython compiler directives
    directives = {
        "language_level": "3",
        "always_allow_keywords": True,
        "binding": True,
        "embedsignature": False,  # Hide function signatures from inspection
        "emit_code_comments": False, # Strip source comments from generated C
    }

    extensions = [
        Extension(
            name=os.path.splitext(os.path.relpath(src_file, API_ROOT))[0].replace(os.sep, "."),
            sources=[src_file],
        )
        for src_file in files_to_build
    ]

    # Save original sys.argv
    orig_argv = sys.argv
    sys.argv = ["setup.py", "build_ext", "--inplace"]

    success = False
    try:
        setup(
            ext_modules=cythonize(
                extensions,
                compiler_directives=directives,
                quiet=False
            )
        )
        print("\n[SUCCESS] All security modules compiled to native machine code (.pyd) successfully!")
        success = True
    except Exception as e:
        print(f"\n[ERROR] Cython compilation failed: {e}")
        success = False
    finally:
        sys.argv = orig_argv

    # Cleanup temporary C files and build directories
    print("\nCleaning up intermediate compilation artifacts...")
    for src_file in existing_files:
        c_file = os.path.splitext(src_file)[0] + ".c"
        if os.path.exists(c_file):
            try:
                os.remove(c_file)
            except Exception:
                pass

    build_dir = os.path.join(API_ROOT, "build")
    if os.path.exists(build_dir):
        try:
            shutil.rmtree(build_dir, ignore_errors=True)
        except Exception:
            pass

    return success

if __name__ == "__main__":
    ok = compile_modules()
    sys.exit(0 if ok else 1)
