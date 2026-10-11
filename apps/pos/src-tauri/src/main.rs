// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::Path;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn main() {
    #[cfg(target_os = "windows")]
    {
        // CREATE_NO_WINDOW = 0x08000000 — Runs process completely hidden in background
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|parent| parent.to_path_buf()));

        let mut launched = false;

        if let Some(ref base) = exe_dir {
            let candidates = [
                base.join("Start_Shop_Server.bat"),
                base.join("..").join("Start_Shop_Server.bat"),
                base.join("..").join("..").join("Start_Shop_Server.bat"),
                base.join("..").join("..").join("..").join("Start_Shop_Server.bat"),
                base.join("..").join("..").join("..").join("..").join("Start_Shop_Server.bat"),
            ];

            for bat in &candidates {
                if bat.exists() {
                    let _ = Command::new("cmd")
                        .args(["/C", bat.to_str().unwrap()])
                        .creation_flags(CREATE_NO_WINDOW)
                        .spawn();
                    launched = true;
                    break;
                }
            }
        }

        if !launched {
            let python_venv = r"d:\webapp\retail-ecosystem\apps\api\venv\Scripts\python.exe";
            let main_py = r"d:\webapp\retail-ecosystem\apps\api\main.py";
            let batch_path = r"d:\webapp\retail-ecosystem\Start_Shop_Server.bat";

            if Path::new(python_venv).exists() && Path::new(main_py).exists() {
                let _ = Command::new(python_venv)
                    .arg(main_py)
                    .current_dir(r"d:\webapp\retail-ecosystem\apps\api")
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
            } else if Path::new(batch_path).exists() {
                let _ = Command::new("cmd")
                    .args(["/C", batch_path])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
            } else {
                let _ = Command::new("python")
                    .args(["apps/api/main.py"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .spawn();
            }
        }
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
