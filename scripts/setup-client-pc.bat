@echo off
:: ========================================================
:: Bilal Cloth & Silk Center — Client PC Setup (Second Computer)
:: Connects this PC to the main shop server with offline domain.
:: ========================================================

echo ========================================================
echo  Bilal Cloth POS - Client PC Setup (sk_bcloth)
echo ========================================================

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Please right-click this file and select "Run as administrator".
    echo Admin permissions are required to configure shop domain mapping.
    pause
    exit /b 1
)

set SERVER_IP=192.168.100.70
set DOMAIN_NAME=bilalclothpos.com
set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts

echo.
echo [1/2] Connecting to Main Shop Server (%SERVER_IP%)...
findstr /C:"%DOMAIN_NAME%" "%HOSTS_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] %DOMAIN_NAME% already mapped in hosts.
) else (
    echo. >> "%HOSTS_FILE%"
    echo # Bilal Cloth POS Main Server >> "%HOSTS_FILE%"
    echo %SERVER_IP%   %DOMAIN_NAME% >> "%HOSTS_FILE%"
    echo [OK] Successfully linked %DOMAIN_NAME% to %SERVER_IP%
)

echo.
echo [2/2] Creating Desktop App Shortcut on Client PC...
set SHORTCUT_SCRIPT=%TEMP%\create_pos_client_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_SCRIPT%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\Bilal Cloth POS.lnk" >> "%SHORTCUT_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_SCRIPT%"
echo oLink.TargetPath = "msedge.exe" >> "%SHORTCUT_SCRIPT%"
echo oLink.Arguments = "--app=http://%DOMAIN_NAME%:3000 --start-fullscreen" >> "%SHORTCUT_SCRIPT%"
echo oLink.Description = "Bilal Cloth & Silk Center POS Terminal" >> "%SHORTCUT_SCRIPT%"
echo oLink.Save >> "%SHORTCUT_SCRIPT%"
cscript //nologo "%SHORTCUT_SCRIPT%" >nul 2>&1
del "%SHORTCUT_SCRIPT%" >nul 2>&1
echo [OK] Desktop shortcut "Bilal Cloth POS" created on your desktop!

echo.
echo ========================================================
echo  CLIENT SETUP COMPLETE!
echo  Desktop icon created: "Bilal Cloth POS"
echo  You can now launch POS directly from your desktop.
echo ========================================================
pause
