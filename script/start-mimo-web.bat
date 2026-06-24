@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

set "MIMO_PORT=4096"
set "WEB_PORT=5173"
set "WORK_DIR=%CD%"

if not "%~1"=="" set "WORK_DIR=%~1"

echo === MiMoCode Web + mimo serve ===
echo   MiMo serve: http://127.0.0.1:%MIMO_PORT%
echo   Web:        http://127.0.0.1:%WEB_PORT%
echo   Trace:      http://127.0.0.1:%WEB_PORT%/trace.html
echo   Work dir:   %WORK_DIR%
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
  if errorlevel 1 goto Fail
)

echo [INFO] Free port %MIMO_PORT% ...
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%MIMO_PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%P >nul 2>&1
timeout /t 1 /nobreak >nul

start "MiMoCode Serve" cmd /k call "%~dp0start-mimo-serve.bat" "%WORK_DIR%" %MIMO_PORT%

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
echo [INFO] Writing trace config ...
set "WORK_DIR_URL=%WORK_DIR:\=/%"
(
echo window.MIMO_TRACE_CONFIG = {
echo   baseUrl: '/mimo',
echo   username: 'mimocode',
echo   password: 'mimocode-standalone',
echo   workDir: '%WORK_DIR_URL%',
echo }
) > "%~dp0..\web\public\mimo-config.js"

echo [INFO] Starting MiMoCode Web (Vite) ...
start "MiMoCode Web" cmd /k "cd /d %~dp0..\web && set VITE_MIMO_WORK_DIR=%WORK_DIR% && npm run dev"

echo [INFO] Waiting for Vite ...
set /a _W=0
:WaitWeb
curl -s http://127.0.0.1:%WEB_PORT%/ 2>nul | findstr /C:"app" >nul 2>&1
if not errorlevel 1 goto OpenBrowser
set /a _W+=1
if !_W! GEQ 45 goto OpenBrowser
timeout /t 1 /nobreak >nul
goto WaitWeb

:OpenBrowser
echo.
echo [OK] Open http://127.0.0.1:%WEB_PORT%/ for chat
echo      Open http://127.0.0.1:%WEB_PORT%/trace.html for call trace
start "" "http://127.0.0.1:%WEB_PORT%/"
echo.
echo Close MiMoCode Serve and MiMoCode Web windows to stop.
pause
exit /b 0

:Fail
echo [ERROR] Startup failed.
pause
exit /b 1
