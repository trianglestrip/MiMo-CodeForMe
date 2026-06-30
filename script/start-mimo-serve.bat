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

curl -s -u mimocode:mimocode-standalone http://%HOST%:%PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo %PORT% ???????У?????????
  pause
  exit /b 0
)

set "MIMOCODE_HOME=%MIMO_REPO%\.dev-home"
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
echo    HOME:     %MIMOCODE_HOME%
echo    Model:    mimo/mimo-auto（可选 deepseek/deepseek-v4-flash、deepseek-v4-pro）
echo    工作目录: 通过 API 请求参数 directory 指定
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
