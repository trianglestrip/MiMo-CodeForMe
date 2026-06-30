@echo off
chcp 65001 >nul 2>&1
REM 启动 mimo serve(4096)；数据目录 distWebServer\.dev-home；cwd = AgentServer 根

for %%I in ("%~dp0..") do set "DIST=%%~fI"
for %%I in ("%~dp0..\..\..") do set "AGENT_ROOT=%%~fI"
set "MIMO_EXE=%DIST%\server\mimo.exe"

curl -s http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo 4096 已在运行，跳过启动
  pause
  exit /b 0
)

if not exist "%MIMO_EXE%" (
  echo [ERROR] 找不到 %MIMO_EXE%
  pause
  exit /b 1
)

if not exist "%DIST%\.dev-home\data" mkdir "%DIST%\.dev-home\data"

if not exist "%DIST%\server\mimo-auth.json" (
  if exist "%DIST%\server\mimo-auth.json.example" (
    copy /Y "%DIST%\server\mimo-auth.json.example" "%DIST%\server\mimo-auth.json" >nul
    echo [INFO] 已从 mimo-auth.json.example 创建 mimo-auth.json，请填写 DeepSeek API Key
  )
)

copy /Y "%DIST%\server\mimo-auth.json" "%DIST%\.dev-home\data\auth.json" >nul 2>&1
if errorlevel 1 (
  copy /Y "%DIST%\server\mimo-auth.json.example" "%DIST%\.dev-home\data\auth.json" >nul 2>&1
)

set "MIMOCODE_HOME=%DIST%\.dev-home"
set "MIMOCODE_CONFIG=%DIST%\server\mimo-config.json"
set "MIMOCODE_MIMO_ONLY=true"
set "MIMOCODE_DISABLE_PROJECT_CONFIG=true"

title MiMo 4096

cd /d "%AGENT_ROOT%"

echo http://127.0.0.1:4096
echo HOME: %MIMOCODE_HOME%
echo CWD: %CD%

"%MIMO_EXE%" serve --hostname 127.0.0.1 --port 4096

pause
