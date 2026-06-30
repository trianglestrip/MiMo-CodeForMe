@echo off
chcp 65001 >nul 2>&1
REM 一键启动 MiMo API（绿色版，无 Web 前端）
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%CD%"

if not exist "%ROOT%\server\mimo.exe" (
  echo [ERROR] 缺少 server\mimo.exe，请先运行 buildserve.bat 或 AgentServer\build-mimo.bat
  pause
  exit /b 1
)

curl -s http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo 4096 已在运行
  echo [OK] API: http://127.0.0.1:4096/
  exit /b 0
)

call "%~dp0stop.bat" /q
start "" cmd /k call "%ROOT%\server\run-mimo.bat"
timeout /t 2 /nobreak >nul

echo [INFO] 等待 MiMo serve ...
set /a _W=0
:WaitMimo
curl -s http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 goto MimoReady
set /a _W+=1
if !_W! GEQ 45 goto MimoFail
timeout /t 1 /nobreak >nul
goto WaitMimo

:MimoFail
echo [WARN] MiMo serve 未就绪，请查看「MiMo 4096」窗口是否有报错
exit /b 1

:MimoReady
echo [OK] MiMo serve 就绪
echo      API: http://127.0.0.1:4096/
exit /b 0
