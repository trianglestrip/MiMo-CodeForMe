@echo off
REM Start built MiMo-CodeForMe serve (port 9000) with context dump enabled
setlocal
set "ROOT=%~dp0"
set "MCFM=%ROOT%.."
cd /d "%MCFM%"

set "PORT=9000"
set "HOST=127.0.0.1"
if not "%~1"=="" set "PORT=%~1"

set "MIMO_BIN=%MCFM%\packages\opencode\dist\mimocode-windows-x64\bin\mimo.exe"
if not exist "%MIMO_BIN%" (
  echo [ERROR] Built mimo not found:
  echo   %MIMO_BIN%
  echo Run: MiMo-CodeForMe\script\build-mimo-serve.bat
  exit /b 1
)

curl -s -u mimocode:mimocode-standalone http://%HOST%:%PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo %PORT% already running
  exit /b 0
)

set "MIMOCODE_HOME=%MCFM%\.dev-home"
if not exist "%MIMOCODE_HOME%\data" mkdir "%MIMOCODE_HOME%\data"

set "MIMOCODE_CONFIG=%MCFM%\script\standalone\mimo-config.json"
copy /Y "%MCFM%\script\standalone\mimo-auth.json" "%MIMOCODE_HOME%\data\auth.json" >nul
set "MIMOCODE_SERVER_USERNAME=mimocode"
set "MIMOCODE_SERVER_PASSWORD=mimocode-standalone"

for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTENING"') do taskkill /F /PID %%A >nul 2>&1
timeout /t 1 /nobreak >nul

title MiMo CodeForMe %PORT%
echo [INFO] Starting %MIMO_BIN% serve on %HOST%:%PORT%
"%MIMO_BIN%" serve --hostname %HOST% --port %PORT%
exit /b %ERRORLEVEL%
