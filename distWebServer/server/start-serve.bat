@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
set "ROOT=%CD%"

set "PORT=4096"
set "HOST=127.0.0.1"
set "WORK_DIR=%ROOT%\work"

if not "%~1"=="" set "WORK_DIR=%~1"

title MiMo 4096

set "MIMO_BIN=%ROOT%\server\mimo.exe"
if not exist "%MIMO_BIN%" (
  echo [ERROR] mimo.exe not found. Run script\build-dist-web-server.bat
  pause
  exit /b 1
)

set "MIMOCODE_HOME=%ROOT%\.dev-home"
if not exist "%MIMOCODE_HOME%\data" mkdir "%MIMOCODE_HOME%\data"

set "MIMOCODE_CONFIG=%ROOT%\server\mimo-config.json"
if not exist "%MIMOCODE_CONFIG%" (
  echo [ERROR] Missing %MIMOCODE_CONFIG%
  pause
  exit /b 1
)
copy /Y "%ROOT%\server\mimo-auth.json" "%MIMOCODE_HOME%\data\auth.json" >nul

echo.
echo  MiMoCode Serve
echo    API:      http://%HOST%:%PORT%
echo    Work dir: %WORK_DIR%
echo    Model:    mimo/mimo-auto
echo.

cd /d "%WORK_DIR%"

call :KillPort %PORT%

echo [INFO] Starting mimo.exe serve ...
"%MIMO_BIN%" serve --hostname %HOST% --port %PORT%
echo.
echo [INFO] MiMoCode serve exited.
pause
exit /b 0

:KillPort
set "_P=%~1"
echo [INFO] Freeing port %_P% ...
for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%_P%" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%A >nul 2>&1
)
timeout /t 1 /nobreak >nul
exit /b 0
