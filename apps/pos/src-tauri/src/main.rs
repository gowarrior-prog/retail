// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn main() {
    #[cfg(target_os = "windows")]
    {
        // Silently launch background shop server process on app startup if available
        let _ = Command::new("cmd")
            .args(["/C", "Start_Shop_Server.bat"])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn();
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
