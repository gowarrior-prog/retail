// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn main() {
    #[cfg(target_os = "windows")]
    {
        // Silently launch python backend server in background with ZERO visible console window
        let python_venv = r"d:\webapp\retail-ecosystem\apps\api\venv\Scripts\python.exe";
        let main_py = r"d:\webapp\retail-ecosystem\apps\api\main.py";

        if Path::new(python_venv).exists() && Path::new(main_py).exists() {
            let _ = Command::new(python_venv)
                .arg(main_py)
                .current_dir(r"d:\webapp\retail-ecosystem\apps\api")
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .spawn();
        } else {
            let _ = Command::new("cmd")
                .args(["/C", "Start_Shop_Server.bat"])
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .spawn();
        }
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
