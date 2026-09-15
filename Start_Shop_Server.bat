@echo off
title Bilal Cloth POS - Main Shop Server
echo =========================================================
echo Starting Bilal Cloth POS Server on PC 1...
echo Host: 0.0.0.0 (All Shop LAN Interfaces) | Port: 8000
echo =========================================================
echo.

cd /d "%~dp0apps\api"
"%~dp0apps\api\venv\Scripts\python.exe" main.py

pause
