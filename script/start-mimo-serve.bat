@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

set "PORT=4096"
set "HOST=127.0.0.1"
set "WORK_DIR=%CD%"

if not "%~1"=="" set "WORK_DIR=%~1"
if not "%~2"=="" set "PORT=%~2"

title MiMo 4096

set "MIMOCODE_HOME=%CD%\.dev-home"
if not exist "%MIMOCODE_HOME%\data" mkdir "%MIMOCODE_HOME%\data"

set "MIMOCODE_CONFIG=%~dp0standalone\mimo-config.json"
copy /Y "%~dp0standalone\mimo-auth.json" "%MIMOCODE_HOME%\data\auth.json" >nul
set "MIMOCODE_SERVER_PASSWORD=mimocode-standalone"
set "MIMOCODE_SERVER_USERNAME=mimocode"

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
echo    User:     %MIMOCODE_SERVER_USERNAME%
echo    Password: %MIMOCODE_SERVER_PASSWORD%
echo    Model:    mimo/mimo-auto
echo    工作目录: 请在 Web 顶部栏设置
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
