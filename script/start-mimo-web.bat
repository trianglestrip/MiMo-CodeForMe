@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

set "MIMO_PORT=9000"
set "WEB_PORT=7000"

echo === BcAI Web + mimo serve ===
echo   MiMo serve: http://127.0.0.1:%MIMO_PORT%
echo   Web:        http://127.0.0.1:%WEB_PORT%
echo   Trace:      http://127.0.0.1:%WEB_PORT%/trace.html
echo   工作目录请在 Web 顶部栏设置
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  pause
  exit /b 1
)

if not exist "%~dp0start-mimo-serve.bat" (
  echo [ERROR] Missing start-mimo-serve.bat
  pause
  exit /b 1
)

cd /d "%~dp0..\web"
if not exist node_modules (
  echo [INFO] npm install ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

set "MIMO_READY=0"
curl -s -u mimocode:mimocode-standalone http://127.0.0.1:%MIMO_PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 set "MIMO_READY=1"

echo [INFO] Free port %WEB_PORT% ...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%WEB_PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%P >nul 2>&1
timeout /t 1 /nobreak >nul

echo [INFO] Writing trace config ...
(
echo window.MIMO_TRACE_CONFIG = {
echo   baseUrl: '/mimo',
echo   username: 'mimocode',
echo   password: 'mimocode-standalone',
echo }
) > "%~dp0..\web\public\mimo-config.js"

if "!MIMO_READY!"=="1" (
  echo [INFO] MiMo %MIMO_PORT% 已在运行，跳过重启
  goto MimoReady
)

echo [INFO] Free port %MIMO_PORT% ...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%MIMO_PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%P >nul 2>&1
timeout /t 1 /nobreak >nul

echo [INFO] Starting MiMo serve ...
start "MiMo %MIMO_PORT%" cmd /k call "%~dp0start-mimo-serve.bat" "" %MIMO_PORT%

echo [INFO] Waiting for MiMo serve ...
set /a _W=0
:WaitMimo
curl -s -u mimocode:mimocode-standalone http://127.0.0.1:%MIMO_PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 goto MimoReady
set /a _W+=1
if !_W! GEQ 60 goto MimoReady
timeout /t 1 /nobreak >nul
goto WaitMimo

:MimoReady
echo [INFO] Starting Web ...
start "Web %WEB_PORT%" cmd /k call "%~dp0run-web-dev.bat"

echo [INFO] Waiting for Web ...
set /a _W=0
:WaitWeb
curl -s http://127.0.0.1:%WEB_PORT%/ 2>nul | findstr /C:"app" >nul 2>&1
if not errorlevel 1 goto Ready
set /a _W+=1
if !_W! GEQ 45 goto Ready
timeout /t 1 /nobreak >nul
goto WaitWeb

:Ready
echo.
echo [OK] MiMo serve: http://127.0.0.1:%MIMO_PORT%/
echo      Web ready:  http://127.0.0.1:%WEB_PORT%/
echo      Trace:      http://127.0.0.1:%WEB_PORT%/trace.html
echo      Close MiMo / Web windows to stop.
exit /b 0
