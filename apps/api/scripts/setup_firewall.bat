@echo off
echo =========================================================
echo Setting up Windows Firewall rule for Bilal Cloth POS Server...
echo =========================================================

netsh advfirewall firewall add rule name="Bilal POS Server Port 8000" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Bilal POS Server Port 3030" dir=in action=allow protocol=TCP localport=3030

echo.
echo [SUCCESS] Windows Firewall rule added! PC 2 and secondary terminals can now connect to this server over LAN.
pause
