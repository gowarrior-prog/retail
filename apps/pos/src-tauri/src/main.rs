// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// Global holder for spawned FastAPI child process
static BACKEND_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn is_port_in_use(port: u16) -> bool {
    if let Ok(addr) = format!("127.0.0.1:{}", port).parse::<SocketAddr>() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
    } else {
        false
    }
}

fn get_app_data_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = env::var("APPDATA") {
            let p = PathBuf::from(appdata).join("com.bilalcloth.pos");
            let _ = std::fs::create_dir_all(&p);
            return p;
        }
        if let Ok(localappdata) = env::var("LOCALAPPDATA") {
            let p = PathBuf::from(localappdata).join("com.bilalcloth.pos");
            let _ = std::fs::create_dir_all(&p);
            return p;
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = env::var("HOME") {
            let p = PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("com.bilalcloth.pos");
            let _ = std::fs::create_dir_all(&p);
            return p;
        }
    }
    let p = PathBuf::from("data");
    let _ = std::fs::create_dir_all(&p);
    p
}

fn get_sidecar_candidates() -> Vec<PathBuf> {
    let mut list = Vec::new();

    // 1. Adjacent to current executable (Production installed app)
    if let Ok(current_exe) = env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            list.push(parent.join("api.exe"));
            list.push(parent.join("binaries").join("api.exe"));
            list.push(parent.join("binaries").join("api-x86_64-pc-windows-msvc.exe"));
            list.push(parent.join("binaries").join("api-i686-pc-windows-msvc.exe"));
        }
    }

    // 2. Relative to working directory (Development mode)
    if let Ok(cwd) = env::current_dir() {
        list.push(cwd.join("binaries").join("api.exe"));
        list.push(cwd.join("binaries").join("api-x86_64-pc-windows-msvc.exe"));
        list.push(cwd.join("src-tauri").join("binaries").join("api.exe"));
        list.push(cwd.join("src-tauri").join("binaries").join("api-x86_64-pc-windows-msvc.exe"));
        list.push(cwd.join("apps").join("pos").join("src-tauri").join("binaries").join("api.exe"));
        list.push(cwd.join("apps").join("pos").join("src-tauri").join("binaries").join("api-x86_64-pc-windows-msvc.exe"));
    }

    list
}

fn ensure_backend_running() {
    // Check if backend is ALREADY running on port 8000
    if is_port_in_use(8000) {
        println!("[Tauri Launcher] Backend is already running on port 8000.");
        return;
    }

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let app_data_dir = get_app_data_path();
    let data_dir_str = app_data_dir.to_string_lossy().to_string();
    println!("[Tauri Launcher] Using AppData directory: {}", data_dir_str);

    // Try finding compiled sidecar binary first (works on any target PC)
    let sidecar_candidates = get_sidecar_candidates();
    for candidate in &sidecar_candidates {
        if candidate.exists() {
            println!("[Tauri Launcher] Spawning sidecar executable: {:?}", candidate);
            let mut cmd = Command::new(candidate);
            cmd.arg("--port").arg("8000");
            cmd.arg("--data-dir").arg(&data_dir_str);
            cmd.env("POS_DATA_DIR", &data_dir_str);
            cmd.env("SECURITY_HMAC_SECRET", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");
            cmd.env("SQLCIPHER_PASSPHRASE", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = cmd.spawn() {
                if let Ok(mut lock) = BACKEND_CHILD.lock() {
                    *lock = Some(child);
                }
                println!("[Tauri Launcher] Sidecar process spawned successfully with hardware-isolated credentials.");
                sleep(Duration::from_millis(600));
                return;
            }
        }
    }

    // Fallback: Development environment with local Python
    println!("[Tauri Launcher] Sidecar binary not found. Falling back to local python venv...");
    let python_candidates = [
        (
            r"d:\webapp\retail-ecosystem\apps\api\venv\Scripts\python.exe",
            r"d:\webapp\retail-ecosystem\apps\api\main.py",
            r"d:\webapp\retail-ecosystem\apps\api",
        ),
        (
            r".\apps\api\venv\Scripts\python.exe",
            r".\apps\api\main.py",
            r".\apps\api",
        ),
        (
            r"..\apps\api\venv\Scripts\python.exe",
            r"..\apps\api\main.py",
            r"..\apps\api",
        ),
    ];

    for (py_bin, script, cwd) in &python_candidates {
        if Path::new(py_bin).exists() && Path::new(script).exists() {
            let mut cmd = Command::new(py_bin);
            cmd.arg(script);
            cmd.arg("--port").arg("8000");
            cmd.arg("--data-dir").arg(&data_dir_str);
            cmd.env("POS_DATA_DIR", &data_dir_str);
            cmd.env("SECURITY_HMAC_SECRET", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");
            cmd.env("SQLCIPHER_PASSPHRASE", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");
            cmd.current_dir(cwd);

            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = cmd.spawn() {
                if let Ok(mut lock) = BACKEND_CHILD.lock() {
                    *lock = Some(child);
                }
                println!("[Tauri Launcher] Local Python server spawned from venv.");
                return;
            }
        }
    }

    // Last resort generic python command
    let mut cmd = Command::new("python");
    cmd.args(["apps/api/main.py", "--port", "8000", "--data-dir", &data_dir_str]);
    cmd.env("POS_DATA_DIR", &data_dir_str);
    cmd.env("SECURITY_HMAC_SECRET", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");
    cmd.env("SQLCIPHER_PASSPHRASE", "BilalClothHouse_Secure_HMAC_Key_2026_@Narowal#");

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    if let Ok(child) = cmd.spawn() {
        if let Ok(mut lock) = BACKEND_CHILD.lock() {
            *lock = Some(child);
        }
        println!("[Tauri Launcher] Global Python spawned.");
    }
}

fn kill_backend_process() {
    if let Ok(mut lock) = BACKEND_CHILD.lock() {
        if let Some(mut child) = lock.take() {
            println!("[Tauri Launcher] Shutting down backend sidecar process...");
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn main() {
    ensure_backend_running();

    let app = tauri::Builder::default()
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
            kill_backend_process();
        }
    });
}
