@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
REM =====================================================================
REM  buildserve-avx2.bat — AVX2 版 mimo serve exe 打包（buildserve.bat 不动）
REM
REM  与 buildserve.bat 的唯一区别：
REM   1) 编译命令去掉 --baseline → bun 原生目标 bun-windows-x64（启用 AVX2）
REM   2) 产物查找顺序：mimocode-windows-x64（AVX2）优先，baseline 回退
REM
REM  背景：本机 CPU（i7-1255U, Alder Lake） 完整支持 AVX2。--baseline 版
REM  关闭了 SIMD，JSON/字符串/正则/加密等 agent 高频操作全走标量慢路径，
REM  是 mimo.exe 持续高 CPU 占用、导致整机卡顿的主因之一。
REM  需要 AVX2 版时跑本脚本；需要兼容老 CPU 的 baseline 版时仍用 buildserve.bat。
REM =====================================================================

if not defined NODE_INSTALL (
  for %%I in ("%~dp0..") do set "NODE_INSTALL=%%~fI\NodeInstall"
)
set "NODE=%NODE_INSTALL%\node\node.exe"
set "BUN_DIR=%NODE_INSTALL%\bun"
set "BUN=%BUN_DIR%\bun.exe"

echo === MiMo-CodeForMe: 打包 mimo serve exe（AVX2） ===
echo.

if not exist "%NODE%" (
  echo [ERROR] 找不到 %NODE%
  pause
  exit /b 1
)
set "PATH=%NODE_INSTALL%\node;%PATH%"

call :EnsureBun
if errorlevel 1 exit /b 1
set "PATH=%BUN_DIR%;%PATH%"

echo [INFO] 打包前停止 mimo 进程 ...
taskkill /F /IM mimo.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul
echo Node: %NODE%
"%NODE%" --version
echo Bun:  %BUN%
"%BUN%" --version
echo.

set "PKG=packages\opencode"
set "OUT=distWebServer\server"
set "BIN_SRC="


echo [1/4] bun install ...
"%BUN%" install --frozen-lockfile
if errorlevel 1 goto BuildFail

echo [2/4] 编译 mimo.exe（AVX2，无 --baseline） ...
cd /d "%~dp0%PKG%"
set "MIMOCODE_CHANNEL=prod"
"%BUN%" --use-system-ca run script/build.ts --single
if errorlevel 1 (
  cd /d "%~dp0"
  goto BuildFail
)
cd /d "%~dp0"

for /d %%D in ("%PKG%\dist\mimocode-windows-x64") do (
  if exist "%%D\bin\mimo.exe" set "BIN_SRC=%%D\bin\mimo.exe"
  if not defined BIN_SRC if exist "%%D\bin\mimo" set "BIN_SRC=%%D\bin\mimo"
)
if not defined BIN_SRC (
  echo [WARN] windows-x64（AVX2）构建产物不存在（下载不稳定），回退到 mimocode-windows-x64-baseline ...
  for /d %%D in ("%PKG%\dist\mimocode-windows-x64-baseline") do (
    if exist "%%D\bin\mimo.exe" set "BIN_SRC=%%D\bin\mimo.exe"
    if not defined BIN_SRC if exist "%%D\bin\mimo" set "BIN_SRC=%%D\bin\mimo"
  )
)
if not defined BIN_SRC (
  echo [ERROR] 找不到 %PKG%\dist\mimocode-windows-x64[-baseline]\bin\mimo[.exe]
  goto BuildFail
)

echo [3/4] 输出到 %OUT% ...
if not exist "%OUT%" mkdir "%OUT%"
copy /Y "!BIN_SRC!" "%OUT%\mimo.exe" >nul
if errorlevel 1 goto BuildFail

echo [4/4] 复制配置与启动脚本 ...
set "STANDALONE=%~dp0script\standalone"
set "LAUNCH=%~dp0script\distWebServer-launch"
if not exist "%STANDALONE%\mimo-config.json" (
  echo [ERROR] 找不到 %STANDALONE%\mimo-config.json
  goto BuildFail
)
if not exist "%LAUNCH%\start.bat" (
  echo [ERROR] 找不到 %LAUNCH%\start.bat
  goto BuildFail
)
rem backup current runtime config before overwrite; restore after build (keep model/providers/api keys)
if exist "%OUT%\mimo-config.json" copy /Y "%OUT%\mimo-config.json" "%OUT%\mimo-config.json.pre-build.bak" >nul
copy /Y "%STANDALONE%\mimo-config.json" "%OUT%\mimo-config.json" >nul
rem keep the runtime config (model/small_model + provider keys) instead of the template
if exist "%OUT%\mimo-config.json.pre-build.bak" (
  copy /Y "%OUT%\mimo-config.json.pre-build.bak" "%OUT%\mimo-config.json" >nul
  echo [INFO] restored runtime mimo-config.json from .pre-build.bak
) else (
  if exist "%OUT%\mimo-config.json.bak" (
    copy /Y "%OUT%\mimo-config.json.bak" "%OUT%\mimo-config.json" >nul
    echo [INFO] restored runtime mimo-config.json from .bak
  )
)
xcopy /E /Y /I /Q "%LAUNCH%\*" "%~dp0distWebServer\" >nul
if errorlevel 1 goto BuildFail

echo.
echo === 打包完成（AVX2） ===
echo   %OUT%\mimo.exe
echo   distWebServer\start.bat
echo.
if /i not "%~1"=="nopause" pause
exit /b 0

:BuildFail
cd /d "%~dp0"
echo [ERROR] 打包失败
if /i not "%~1"=="nopause" pause
exit /b 1

:EnsureBun
if not exist "%BUN_DIR%" mkdir "%BUN_DIR%"
if not exist "%BUN%" call :InstallBunToNodeInstall
if not exist "%BUN%" (
  echo [ERROR] 无法安装 Bun 到 %BUN_DIR%
  pause
  exit /b 1
)
call :BunVersionOk
if not errorlevel 1 exit /b 0

echo [INFO] Bun 版本过低，升级 %BUN% ...
"%BUN%" upgrade
call :BunVersionOk
if not errorlevel 1 exit /b 0

call :InstallBunToNodeInstall
call :BunVersionOk
if errorlevel 1 (
  echo [ERROR] Bun 升级后仍不满足 package.json packageManager 要求
  pause
  exit /b 1
)
exit /b 0

:InstallBunToNodeInstall
where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 未找到系统 Bun，无法安装到 %BUN_DIR%
  exit /b 1
)
echo [INFO] 同步系统 Bun 到 %BUN_DIR% ...
bun upgrade >nul 2>&1
if exist "%USERPROFILE%\.bun\bin\bun.exe" (
  copy /Y "%USERPROFILE%\.bun\bin\bun.exe" "%BUN%" >nul
) else (
  for /f "delims=" %%P in ('where bun 2^>nul') do (
    copy /Y "%%P" "%BUN%" >nul
    exit /b 0
  )
)
exit /b 0

:BunVersionOk
set "BUN_VER="
for /f "delims=" %%V in ('"%BUN%" --version 2^>nul') do set "BUN_VER=%%V"
if not defined BUN_VER exit /b 1
"%NODE%" "%~dp0script\standalone\check-bun.cjs" "!BUN_VER!"
exit /b %errorlevel%
