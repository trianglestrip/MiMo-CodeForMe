@echo off

REM ?? mimo serve?4096??? start.bat ??

cd /d "%~dp0.."

set "ROOT=%CD%"



curl -s http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1

if not errorlevel 1 (

  echo [INFO] MiMo 4096 ?????????

  pause

  exit /b 0

)



if not exist "%ROOT%\.dev-home\data" mkdir "%ROOT%\.dev-home\data"

copy /Y "%ROOT%\server\mimo-auth.json" "%ROOT%\.dev-home\data\auth.json" >nul

set "MIMOCODE_HOME=%ROOT%\.dev-home"

set "MIMOCODE_CONFIG=%ROOT%\server\mimo-config.json"

set "MIMOCODE_MIMO_ONLY=true"

set "MIMOCODE_DISABLE_PROJECT_CONFIG=true"



title MiMo 4096

cd /d "%ROOT%"

"%ROOT%\server\mimo.exe" serve --hostname 127.0.0.1 --port 4096

pause

