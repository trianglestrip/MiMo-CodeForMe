@echo off
chcp 65001 >nul 2>&1
REM 启动 mimo serve(4096)；数据目录 distWebServer\.dev-home

for %%I in ("%~dp0..") do set "ROOT=%%~fI"
set "MIMO_EXE=%ROOT%\server\mimo.exe"

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

if not exist "%ROOT%\.dev-home\data" mkdir "%ROOT%\.dev-home\data"

if not exist "%ROOT%\server\mimo-auth.json" (
  if exist "%ROOT%\server\mimo-auth.json.example" (
    copy /Y "%ROOT%\server\mimo-auth.json.example" "%ROOT%\server\mimo-auth.json" >nul
    echo [INFO] 已从 mimo-auth.json.example 创建 mimo-auth.json，请填写 DeepSeek API Key
  )
)

copy /Y "%ROOT%\server\mimo-auth.json" "%ROOT%\.dev-home\data\auth.json" >nul 2>&1
if errorlevel 1 (
  copy /Y "%ROOT%\server\mimo-auth.json.example" "%ROOT%\.dev-home\data\auth.json" >nul 2>&1
)

set "MIMOCODE_HOME=%ROOT%\.dev-home"
set "MIMOCODE_CONFIG=%ROOT%\server\mimo-config.json"
set "MIMOCODE_MIMO_ONLY=true"
set "MIMOCODE_DISABLE_PROJECT_CONFIG=true"

title MiMo 4096

cd /d "%ROOT%"

echo http://127.0.0.1:4096
echo HOME: %MIMOCODE_HOME%
echo CWD: %CD%

"%MIMO_EXE%" serve --hostname 127.0.0.1 --port 4096

pause
