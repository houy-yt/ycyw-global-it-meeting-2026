@echo off
REM Restores Windows dynamic (ephemeral) TCP/UDP port range to the default 1024-65535.
REM Use this to revert fix-hyperv-port-range.bat.
REM Requires admin rights; a reboot is needed afterwards for exclusions to regenerate.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Current dynamic port ranges (before):
netsh int ipv4 show dynamicport tcp
netsh int ipv6 show dynamicport tcp

echo.
echo Restoring default range 1024-65535...
netsh int ipv4 set dynamicport tcp start=1024 num=64511
netsh int ipv4 set dynamicport udp start=1024 num=64511
netsh int ipv6 set dynamicport tcp start=1024 num=64511
netsh int ipv6 set dynamicport udp start=1024 num=64511

echo.
echo Done. Dynamic port ranges (after):
netsh int ipv4 show dynamicport tcp
netsh int ipv6 show dynamicport tcp

echo.
echo A reboot is required for Hyper-V/WSL2 to regenerate its excluded port ranges within the new range.
pause
