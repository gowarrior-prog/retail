@echo off
:: ========================================================
:: Bilal Cloth & Silk Center — Offline Domain & Port 80 Setup
:: Configures "http://bilalclothpos.com" on this computer.
:: ========================================================

echo ========================================================
echo  Bilal Cloth POS - Offline Domain Setup (bilalclothpos.com)
echo ========================================================

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please right-click this file and select "Run as administrator".
    echo Admin permissions are required to update local domain mappings.
    pause
    exit /b 1
)

set SERVER_IP=192.168.100.70
set DOMAIN_NAME=bilalclothpos.com
set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts

echo.
echo [1/3] Configuring local hosts mapping for %DOMAIN_NAME%...
findstr /C:"%DOMAIN_NAME%" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] %DOMAIN_NAME% is already present in hosts file.
) else (
    echo. >> "%HOSTS_FILE%"
    echo # Bilal Cloth POS Local Network Mapping >> "%HOSTS_FILE%"
    echo 127.0.0.1       %DOMAIN_NAME% >> "%HOSTS_FILE%"
    echo %SERVER_IP%   %DOMAIN_NAME% >> "%HOSTS_FILE%"
    echo [OK] Added %DOMAIN_NAME% to %HOSTS_FILE%
)

echo.
echo [2/3] Configuring Port 80 Proxy (No port numbers needed in browser)...
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=3000 connectaddress=127.0.0.1 >nul 2>&1
echo [OK] Port 80 mapped to Port 3000. Now http://%DOMAIN_NAME% works directly!

echo.
echo [3/3] Creating Desktop App Shortcut...
set SHORTCUT_SCRIPT=%TEMP%\create_pos_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Bilal Cloth POS.lnk" >> "%SHORTCUT_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_SCRIPT%"
echo oLink.TargetPath = "msedge.exe" >> "%SHORTCUT_SCRIPT%"
echo oLink.Arguments = "--app=http://%DOMAIN_NAME% --start-fullscreen" >> "%SHORTCUT_SCRIPT%"
echo oLink.Description = "Bilal Cloth & Silk Center POS Terminal" >> "%SHORTCUT_SCRIPT%"
echo oLink.Save >> "%SHORTCUT_SCRIPT%"
cscript //nologo "%SHORTCUT_SCRIPT%" >nul 2>&1
del "%SHORTCUT_SCRIPT%" >nul 2>&1
echo [OK] Desktop shortcut "Bilal Cloth POS" created successfully!

echo.
echo ========================================================
echo  SETUP COMPLETE!
echo  You can now access POS at: http://%DOMAIN_NAME%
echo ========================================================
pause
