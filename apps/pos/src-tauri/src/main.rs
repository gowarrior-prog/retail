// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn main() {
    #[cfg(target_os = "windows")]
    {
        // Check project absolute path first, then fallback to current directory
        let script_path = if Path::new(r"d:\webapp\retail-ecosystem\Start_Shop_Server.bat").exists() {
            r"d:\webapp\retail-ecosystem\Start_Shop_Server.bat"
        } else {
            "Start_Shop_Server.bat"
        };

        let _ = Command::new("cmd")
            .args(["/C", script_path])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
