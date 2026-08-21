@echo off
chcp 65001 >nul 2>&1
REM Stop MiMo :4096; use AgentServer\stop.bat for full shutdown
REM 优先用 PowerShell 的 Get-NetTCPConnection 查端口占用（沙箱/部分环境下 netstat 会挂死）
where powershell >nul 2>&1
if not errorlevel 1 (
  for /f "usebackq tokens=*" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-NetTCPConnection -LocalPort 4096 -State Listen -ErrorAction SilentlyContinue).OwningProcess" 2^>nul`) do (
    if not "%%P"=="" if not "%%P"=="0" taskkill /F /PID %%P >nul 2>&1
  )
) else (
  for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":4096" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
)
taskkill /F /IM mimo.exe >nul 2>&1
if /i not "%~1"=="/q" (
  echo [OK] MiMo 4096 已停止
)
exit /b 0
