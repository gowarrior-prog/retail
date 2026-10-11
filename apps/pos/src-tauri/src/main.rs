// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn ensure_backend_running() {
    #[cfg(target_os = "windows")]
    {
        use std::net::{TcpStream, SocketAddr};
        use std::time::Duration;
        use std::thread::sleep;

        // 1. Check if backend server is ALREADY running on 127.0.0.1:8000
        if let Ok(addr) = "127.0.0.1:8000".parse::<SocketAddr>() {
            if TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok() {
                return; // Server is already alive and running, nothing to do!
            }
        }

        // 2. CREATE_NO_WINDOW = 0x08000000 — 100% silent background process, zero CMD window
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let python_candidates = [
            (r"d:\webapp\retail-ecosystem\apps\api\venv\Scripts\python.exe", r"d:\webapp\retail-ecosystem\apps\api\main.py", r"d:\webapp\retail-ecosystem\apps\api"),
            (r".\apps\api\venv\Scripts\python.exe", r".\apps\api\main.py", r".\apps\api"),
            (r"..\apps\api\venv\Scripts\python.exe", r"..\apps\api\main.py", r"..\apps\api"),
        ];

        let mut spawned = false;
        for (py_bin, script, cwd) in &python_candidates {
            if Path::new(py_bin).exists() && Path::new(script).exists() {
                let _ = Command::new(py_bin)
                    .arg(script)
                    .current_dir(cwd)
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                spawned = true;
                break;
            }
        }

        if !spawned {
            let batch_path = r"d:\webapp\retail-ecosystem\Start_Shop_Server.bat";
            if Path::new(batch_path).exists() {
                let _ = Command::new("cmd")
                    .args(["/C", batch_path])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
                spawned = true;
            }
        }

        if !spawned {
            let _ = Command::new("python")
                .args(["apps/api/main.py"])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
        }

        // 3. Allow background server a moment to bind port 8000 before window finishes loading
        sleep(Duration::from_millis(600));
    }
}

fn main() {
    ensure_backend_running();

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
