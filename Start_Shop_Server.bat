@echo off
title Bilal Cloth POS - Main Shop Server (PC 1)
color 0A
echo =========================================================
echo       BILAL CLOTH ^& SILK CENTER - MAIN SHOP SERVER
echo =========================================================
echo Host: 0.0.0.0 (Listening on All Shop Network Cards)
echo Port: 8000
echo =========================================================
echo.

cd /d "%~dp0apps\api"

if exist "%~dp0apps\api\venv\Scripts\python.exe" (
    echo [INFO] Starting Python server using virtual environment...
    "%~dp0apps\api\venv\Scripts\python.exe" main.py
) else (
    echo [INFO] Starting Python server using system Python...
    python main.py
)

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server stopped with error code %errorlevel%.
)

pause
