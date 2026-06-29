@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "NODE_INSTALL=%~dp0..\NodeInstall"
set "BUN=%NODE_INSTALL%\bun\bun.exe"

echo === MiMo-CodeForMe: 打包 mimo serve exe ===
echo.

call "%NODE_INSTALL%\use-node.bat"
if errorlevel 1 (
  echo [ERROR] 找不到 %NODE_INSTALL%\node\node.exe
  pause
  exit /b 1
)

if exist "%BUN%" (
  set "PATH=%NODE_INSTALL%\bun;%PATH%"
  goto BunReady
)

set "BUN=bun"
where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未找到 Bun，请检查 %NODE_INSTALL%\bun\bun.exe 或安装 Bun
  pause
  exit /b 1
)

:BunReady

echo 使用 Node: %NODE%
"%NODE%" --version
echo 使用 Bun:  %BUN%
"%BUN%" --version
echo.

set "PKG=packages\opencode"
set "OUT=distWebServer\server"
set "BIN_SRC="

if not exist "%PKG%\script\build.ts" (
  echo [ERROR] 找不到 %PKG%\script\build.ts
  pause
  exit /b 1
)

echo [1/4] 安装依赖 ^(bun install^)...
"%BUN%" install
if errorlevel 1 goto BuildFail

echo [2/4] 编译 Windows 单文件 exe...
cd /d "%~dp0%PKG%"
set "MIMOCODE_CHANNEL=prod"
"%BUN%" run script/build.ts --single
if errorlevel 1 (
  cd /d "%~dp0"
  goto BuildFail
)
cd /d "%~dp0"

for /d %%D in ("%PKG%\dist\mimocode-windows-*") do (
  if exist "%%D\bin\mimo.exe" set "BIN_SRC=%%D\bin\mimo.exe"
  if not defined BIN_SRC if exist "%%D\bin\mimo" set "BIN_SRC=%%D\bin\mimo"
)

if not defined BIN_SRC (
  echo [ERROR] 找不到编译产物 %PKG%\dist\mimocode-windows-*\bin\mimo[.exe]
  goto BuildFail
)

echo [3/4] 输出到 %OUT% ...
if not exist "%OUT%" mkdir "%OUT%"
copy /Y "!BIN_SRC!" "%OUT%\mimo.exe" >nul
if errorlevel 1 goto BuildFail

echo [4/4] 补齐 serve 配置模板...
if not exist "%OUT%\mimo-config.json" (
  powershell -NoProfile -Command ^
    "$cfg = @{ '$schema' = 'https://opencode.ai/config.json'; model = 'mimo/mimo-auto'; disabled_providers = @('opencode','opencode-go') } | ConvertTo-Json -Depth 5; Set-Content -Path '%OUT%\mimo-config.json' -Value $cfg -Encoding UTF8"
)
if not exist "%OUT%\mimo-auth.json.example" (
  powershell -NoProfile -Command ^
    "$auth = @{ mimo = @{ type = 'api'; key = 'mimo-free' } } | ConvertTo-Json -Depth 5; Set-Content -Path '%OUT%\mimo-auth.json.example' -Value $auth -Encoding UTF8"
)

echo.
echo === 打包完成 ===
echo   %OUT%\mimo.exe
echo   %OUT%\mimo-config.json
echo   %OUT%\mimo-auth.json.example
echo.
echo 启动: 在 AgentServer 根目录运行 start-mimo.bat
echo.
if /i not "%~1"=="nopause" pause
exit /b 0

:BuildFail
cd /d "%~dp0"
echo [ERROR] 打包失败
if /i not "%~1"=="nopause" pause
exit /b 1
