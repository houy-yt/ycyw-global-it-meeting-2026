@echo off
REM Shrinks the Windows dynamic (ephemeral) TCP/UDP port range to 49152-65535
REM so Hyper-V/WSL2 port exclusions no longer overlap dev ports like 3000/5173/8080.
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
echo Applying new range 49152-65535...
netsh int ipv4 set dynamicport tcp start=49152 num=16383
netsh int ipv4 set dynamicport udp start=49152 num=16383
netsh int ipv6 set dynamicport tcp start=49152 num=16383
netsh int ipv6 set dynamicport udp start=49152 num=16383

echo.
echo Done. Dynamic port ranges (after):
netsh int ipv4 show dynamicport tcp
netsh int ipv6 show dynamicport tcp

echo.
echo A reboot is required for Hyper-V/WSL2 to regenerate its excluded port ranges within the new range.
pause
