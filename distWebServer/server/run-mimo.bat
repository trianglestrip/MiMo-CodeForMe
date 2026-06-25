@echo off
REM 独立窗口运行 mimo serve（由 start.bat 调用）
cd /d "%~dp0.."
set "ROOT=%CD%"

if not exist "%ROOT%\.dev-home\data" mkdir "%ROOT%\.dev-home\data"
copy /Y "%ROOT%\server\mimo-auth.json" "%ROOT%\.dev-home\data\auth.json" >nul
set "MIMOCODE_HOME=%ROOT%\.dev-home"
set "MIMOCODE_CONFIG=%ROOT%\server\mimo-config.json"

title MiMo 4096
cd /d "%ROOT%"
"%ROOT%\server\mimo.exe" serve --hostname 127.0.0.1 --port 4096
pause
