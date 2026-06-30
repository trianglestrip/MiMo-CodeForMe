@echo off
REM 启动源码编译产物 packages\opencode\dist\...\mimo.exe（开发用，9000）
setlocal
for %%I in ("%~dp0..") do set "MIMO_REPO=%%~fI"
cd /d "%MIMO_REPO%"

set "PORT=9000"
set "HOST=127.0.0.1"
if not "%~1"=="" set "PORT=%~1"

set "MIMO_BIN=%MIMO_REPO%\packages\opencode\dist\mimocode-windows-x64\bin\mimo.exe"
if not exist "%MIMO_BIN%" (
  echo [ERROR] 找不到编译产物:
  echo   %MIMO_BIN%
  echo 请先运行 script\build-mimo-serve.bat
  exit /b 1
)

curl -s -u mimocode:mimocode-standalone http://%HOST%:%PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo %PORT% 已在运行
  exit /b 0
)

set "MIMOCODE_HOME=%MIMO_REPO%\.dev-home"
if not exist "%MIMOCODE_HOME%\data" mkdir "%MIMOCODE_HOME%\data"

set "MIMOCODE_CONFIG=%MIMO_REPO%\script\standalone\mimo-config.json"
if not exist "%MIMOCODE_HOME%\data\auth.json" (
  if exist "%MIMO_REPO%\script\standalone\mimo-auth.json.example" (
    copy /Y "%MIMO_REPO%\script\standalone\mimo-auth.json.example" "%MIMOCODE_HOME%\data\auth.json" >nul
  ) else if exist "%MIMO_REPO%\script\standalone\mimo-auth.json" (
    copy /Y "%MIMO_REPO%\script\standalone\mimo-auth.json" "%MIMOCODE_HOME%\data\auth.json" >nul
  )
)
set "MIMOCODE_SERVER_USERNAME=mimocode"
set "MIMOCODE_SERVER_PASSWORD=mimocode-standalone"

for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%A >nul 2>&1
timeout /t 1 /nobreak >nul

title MiMo CodeForMe %PORT%
echo [INFO] HOME: %MIMOCODE_HOME%
echo [INFO] Starting %MIMO_BIN% on %HOST%:%PORT%
"%MIMO_BIN%" serve --hostname %HOST% --port %PORT%
exit /b %ERRORLEVEL%
