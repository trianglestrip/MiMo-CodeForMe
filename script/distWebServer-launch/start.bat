@echo off
chcp 65001 >nul 2>&1
REM Start MiMo API green package (no web UI)
REM Optional /bg: background in same window (AgentServer start.bat or dev.bat)
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%CD%"
set "BG=0"
if /i "%~1"=="/bg" set "BG=1"

if not exist "%ROOT%\server\mimo.exe" (
  echo [ERROR] 缺少 server\mimo.exe，请先运行 buildserve.bat 或 AgentServer\build-mimo.bat
  pause
  exit /b 1
)

curl -s -u mimocode:aiep2024 http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo 4096 已在运行
  echo [OK] API: http://127.0.0.1:4096/
  exit /b 0
)

call "%~dp0stop.bat" /q
if "!BG!"=="1" (
  start /B call "%ROOT%\server\run-mimo.bat" /bg
) else (
  start "" cmd /k call "%ROOT%\server\run-mimo.bat"
)
echo [OK] MiMo serve 已启动（后台启动中，前端自动检测连接状态）
echo      API: http://127.0.0.1:4096/
exit /b 0
