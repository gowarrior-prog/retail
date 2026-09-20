@echo off
:: Bilal Cloth POS - Single File Silent Background Shop Server
:: Automatically opens Windows Firewall Port 8000 and runs hidden without CMD window.

if "%~1"=="-background" goto RUN_SERVER

:: Launch hidden background process and exit CMD window immediately
powershell -Command "Start-Process '%~f0' -ArgumentList '-background' -WindowStyle Hidden"
exit /b

:RUN_SERVER
cd /d "%~dp0apps\api"

:: Ensure Windows Firewall rule allows inbound LAN connections on TCP Port 8000
netsh advfirewall firewall add rule name="Bilal POS Server (Port 8000)" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

if exist "%~dp0apps\api\venv\Scripts\python.exe" (
    "%~dp0apps\api\venv\Scripts\python.exe" main.py
) else (
    python main.py
)
