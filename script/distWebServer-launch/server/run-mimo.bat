@echo off
chcp 65001 >nul 2>&1
REM mimo serve :4096; data in distWebServer\.dev-home; cwd = AgentServer root

if /i "%~1"=="/bg" set "AIEP_BG=1"

for %%I in ("%~dp0..") do set "DIST=%%~fI"
for %%I in ("%~dp0..\..\..") do set "AGENT_ROOT=%%~fI"
set "MIMO_EXE=%DIST%\server\mimo.exe"
if not defined MIMOCODE_SERVER_USERNAME set "MIMOCODE_SERVER_USERNAME=mimocode"
if not defined MIMOCODE_SERVER_PASSWORD set "MIMOCODE_SERVER_PASSWORD=aiep2024"

curl -s -u "%MIMOCODE_SERVER_USERNAME%:%MIMOCODE_SERVER_PASSWORD%" http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo 4096 已在运行，跳过启动
  if not defined AIEP_BG pause
  exit /b 0
)

if not exist "%MIMO_EXE%" (
  echo [ERROR] 找不到 %MIMO_EXE%
  pause
  exit /b 1
)

if not exist "%DIST%\.dev-home\data" mkdir "%DIST%\.dev-home\data"
if not exist "%DIST%\.dev-home\config" mkdir "%DIST%\.dev-home\config"

if not exist "%DIST%\.dev-home\data\auth.json" (
  if exist "%DIST%\server\mimo-auth.json.example" (
    copy /Y "%DIST%\server\mimo-auth.json.example" "%DIST%\.dev-home\data\auth.json" >nul
    echo [INFO] 已从 mimo-auth.json.example 初始化 auth.json
  )
)

set "MIMOCODE_HOME=%DIST%\.dev-home"
set "MIMOCODE_CONFIG=%DIST%\server\mimo-config.json"
set "MIMOCODE_MIMO_ONLY=true"
set "MIMOCODE_DISABLE_EXTERNAL_SKILLS=true"
set "MIMOCODE_DISABLE_PROJECT_CONFIG=true"

title MiMo 4096

cd /d "%AGENT_ROOT%"

echo http://127.0.0.1:4096
echo HOME: %MIMOCODE_HOME%
echo CWD: %CD%

"%MIMO_EXE%" serve --hostname 127.0.0.1 --port 4096

if not defined AIEP_BG pause
