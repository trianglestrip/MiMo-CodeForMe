@echo off
setlocal enabledelayedexpansion
for %%I in ("%~dp0..") do set "MIMO_REPO=%%~fI"
cd /d "%MIMO_REPO%"

set "PORT=9000"
set "HOST=127.0.0.1"
set "WORK_DIR=%MIMO_REPO%"

if not "%~1"=="" set "WORK_DIR=%~1"
if not "%~2"=="" set "PORT=%~2"

title MiMo %PORT%

curl -s http://%HOST%:%PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo %PORT% ???????��?????????
  pause
  exit /b 0
)

set "MIMOCODE_HOME=%MIMO_REPO%\.dev-home"
if not exist "%MIMOCODE_HOME%\data" mkdir "%MIMOCODE_HOME%\data"

if exist "%~dp0standalone\mimo-config.local.json" (
  set "MIMOCODE_CONFIG=%~dp0standalone\mimo-config.local.json"
) else (
  set "MIMOCODE_CONFIG=%~dp0standalone\mimo-config.json"
)
if not exist "%MIMOCODE_HOME%\data\auth.json" (
  if exist "%~dp0standalone\mimo-auth.json.example" (
    copy /Y "%~dp0standalone\mimo-auth.json.example" "%MIMOCODE_HOME%\data\auth.json" >nul
  ) else if exist "%~dp0standalone\mimo-auth.json" (
    copy /Y "%~dp0standalone\mimo-auth.json" "%MIMOCODE_HOME%\data\auth.json" >nul
  )
)
REM 无密码模式

where mimo >nul 2>&1
if errorlevel 1 (
  where mimo.cmd >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] mimo not found. Install:
    echo   npm install -g @mimo-ai/cli @mimo-ai/mimocode-windows-x64
    pause
    exit /b 1
  )
  set "MIMO_BIN=mimo.cmd"
) else (
  set "MIMO_BIN=mimo"
)

echo.
echo  MiMoCode Serve
echo    API:      http://%HOST%:%PORT%
echo    HOME:     %MIMOCODE_HOME%
echo.

cd /d "%WORK_DIR%"

call :KillPort %PORT%

echo [INFO] Starting %MIMO_BIN% serve ...
%MIMO_BIN% serve --hostname %HOST% --port %PORT%
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
