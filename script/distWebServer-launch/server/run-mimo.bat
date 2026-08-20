@echo off
chcp 65001 >nul 2>&1
REM mimo serve :4096; data in distWebServer\.dev-home; cwd = AgentServer root

if /i "%~1"=="/bg" set "AIEP_BG=1"

for %%I in ("%~dp0..") do set "DIST=%%~fI"
for %%I in ("%~dp0..\..\..") do set "AGENT_ROOT=%%~fI"
set "MIMO_EXE=%DIST%\server\mimo.exe"

curl -s -u mimocode:aiep2024 http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
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
REM 设置服务器密码后，MiMo 跳过 directory 沙箱检查，允许任意工作目录
set "MIMOCODE_SERVER_PASSWORD=aiep2024"
if exist "%DIST%\server\mimo-config.user.json" (
  set "MIMOCODE_CONFIG=%DIST%\server\mimo-config.user.json"
) else if exist "%AGENT_ROOT%\mimo-config.json" (
  set "MIMOCODE_CONFIG=%AGENT_ROOT%\mimo-config.json"
) else (
  set "MIMOCODE_CONFIG=%DIST%\server\mimo-config.json"
)
REM Prepend bundled tools dir to PATH so ripgrep (rg.exe) is found without download
set "PATH=%~dp0tools;%PATH%"
set "MIMOCODE_MIMO_ONLY=true"
set "MIMOCODE_DISABLE_EXTERNAL_SKILLS=true"
set "MIMOCODE_DISABLE_PROJECT_CONFIG=true"
REM 与 dist 运行版一致：显式加载 .mimocode 配置目录（含 doc-manager MCP 注册），
REM 因为 DISABLE_PROJECT_CONFIG 会跳过默认的项目 .mimocode 扫描
if exist "%AGENT_ROOT%\.mimocode" set "MIMOCODE_CONFIG_DIR=%AGENT_ROOT%\.mimocode"
if exist "%AGENT_ROOT%\dist\python_env\python\python.exe" set "MIMO_PYTHON_EXE=%AGENT_ROOT%\dist\python_env\python\python.exe"
set "MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL=true"

title MiMo 4096

cd /d "%AGENT_ROOT%"

echo http://127.0.0.1:4096
echo HOME: %MIMOCODE_HOME%
echo CWD: %CD%

"%MIMO_EXE%" serve --hostname 127.0.0.1 --port 4096

if not defined AIEP_BG pause
