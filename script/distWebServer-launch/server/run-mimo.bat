@echo off
chcp 65001 >nul 2>&1
REM mimo serve :4096; data in distWebServer\.dev-home; cwd = AgentServer root
REM 可选参数 --low : 以 BelowNormal 优先级 + 绑定能效核(E) 启动 mimo.exe，
REM 把性能核(P)让给浏览器/IDE，缓解整机卡顿（i7-1255U = 2P+8E，P=LP0-3，E=LP4-11 → 0xFF0）

if /i "%~1"=="/bg" set "AIEP_BG=1"
if /i "%~1"=="--low" set "MIMO_LOW=1"
if /i "%~2"=="--low" set "MIMO_LOW=1"

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

REM 性能/隐私优化（缓解 mimo.exe 卡顿）
REM 注：遥测(MIMOCODE_ENABLE_ANALYSIS)已在 flag.ts 默认关闭，无需此处单独设置
REM MIMOCODE_DISABLE_CRON=true      : 关闭每秒 setInterval 心跳（cron-bridge 实时读取）
REM MIMOCODE_DISABLE_AUTOUPDATE=true: 关闭启动期联网查版本
set "MIMOCODE_DISABLE_CRON=true"
set "MIMOCODE_DISABLE_AUTOUPDATE=true"

title MiMo 4096

cd /d "%AGENT_ROOT%"

echo http://127.0.0.1:4096
echo HOME: %MIMOCODE_HOME%
echo CWD: %CD%

if defined MIMO_LOW (
  echo [INFO] --low 模式：BelowNormal 优先级 + 绑定 E 核（affinity 0xFF0）启动 mimo.exe ...
  powershell -NoProfile -Command "$p = Start-Process -FilePath '%MIMO_EXE%' -ArgumentList 'serve','--hostname','127.0.0.1','--port','4096' -WorkingDirectory '%AGENT_ROOT%' -PassThru; try { $p.PriorityClass = 'BelowNormal'; $p.ProcessorAffinity = [IntPtr]0xFF0 } catch { Write-Host ('[WARN] 设置优先级/亲和性失败: ' + $_.Exception.Message) }; $p.WaitForExit()"
) else (
  "%MIMO_EXE%" serve --hostname 127.0.0.1 --port 4096
)

if not defined AIEP_BG pause
