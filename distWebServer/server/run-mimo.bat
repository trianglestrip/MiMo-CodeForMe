@echo off
REM ???????????? mimo serve???? start.bat ?????
cd /d "%~dp0.."
set "ROOT=%CD%"

curl -s http://127.0.0.1:9000/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo 9000 ???????§µ????????
  pause
  exit /b 0
)

if not exist "%ROOT%\.dev-home\data" mkdir "%ROOT%\.dev-home\data"
copy /Y "%ROOT%\server\mimo-auth.json" "%ROOT%\.dev-home\data\auth.json" >nul
set "MIMOCODE_HOME=%ROOT%\.dev-home"
set "MIMOCODE_CONFIG=%ROOT%\server\mimo-config.json"

title MiMo 9000
cd /d "%ROOT%"
"%ROOT%\server\mimo.exe" serve --hostname 127.0.0.1 --port 9000
pause
