@echo off
REM 启动 distWebServer 打包版 mimo.exe serve（默认 4096）
setlocal
cd /d "%~dp0.."

if not defined MIMO_PORT set "MIMO_PORT=4096"
set "HOST=127.0.0.1"
set "ROOT=%CD%\distWebServer"
set "MIMO_EXE=%ROOT%\server\mimo.exe"

curl -s http://%HOST%:%MIMO_PORT%/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] MiMo %MIMO_PORT% 已在运行
  echo [OK] API: http://%HOST%:%MIMO_PORT%/
  pause
  exit /b 0
)

if not exist "%MIMO_EXE%" (
  echo [ERROR] 找不到 %MIMO_EXE%
  echo        请先运行 buildserve.bat 构建
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

title MiMo %MIMO_PORT%

cd /d "%ROOT%"

echo [OK] API: http://%HOST%:%MIMO_PORT%/

"%MIMO_EXE%" serve --hostname %HOST% --port %MIMO_PORT%

pause
exit /b 0
