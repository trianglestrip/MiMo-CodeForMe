@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if not defined NODE_INSTALL (
  for %%I in ("%~dp0..") do set "NODE_INSTALL=%%~fI\NodeInstall"
)
set "NODE=%NODE_INSTALL%\node\node.exe"
set "BUN_DIR=%NODE_INSTALL%\bun"
set "BUN=%BUN_DIR%\bun.exe"

echo === MiMo-CodeForMe: pack mimo serve exe ===
echo.

if not exist "%NODE%" (
  echo [ERROR] Missing %NODE%
  pause
  exit /b 1
)
set "PATH=%NODE_INSTALL%\node;%PATH%"

call :EnsureBun
if errorlevel 1 exit /b 1
set "PATH=%BUN_DIR%;%PATH%"

echo [INFO]       mimo    ...
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

echo [2/4]    mimo.exe ...
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
  echo [ERROR] Missing %PKG%\dist\mimocode-windows-x64\bin\mimo[.exe]
  goto BuildFail
)

echo [3/4]     %OUT% ...
if not exist "%OUT%" mkdir "%OUT%"
copy /Y "!BIN_SRC!" "%OUT%\mimo.exe" >nul
if errorlevel 1 goto BuildFail

echo [4/4]           ...
set "STANDALONE=%~dp0script\standalone"
set "LAUNCH=%~dp0script\distWebServer-launch"
if not exist "%STANDALONE%\mimo-config.json" (
  echo [ERROR] Missing %STANDALONE%\mimo-config.json
  goto BuildFail
)
if not exist "%LAUNCH%\start.bat" (
  echo [ERROR] Missing %LAUNCH%\start.bat
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
echo ===      ===
echo   %OUT%\mimo.exe
echo   distWebServer\start.bat
echo.
if /i not "%~1"=="nopause" pause
exit /b 0

:BuildFail
cd /d "%~dp0"
echo [ERROR] Build failed
if /i not "%~1"=="nopause" pause
exit /b 1

:EnsureBun
if not exist "%BUN_DIR%" mkdir "%BUN_DIR%"
if not exist "%BUN%" call :InstallBunToNodeInstall
if not exist "%BUN%" (
  echo [ERROR] Cannot install Bun to %BUN_DIR%
  pause
  exit /b 1
)
call :BunVersionOk
if not errorlevel 1 exit /b 0

echo [INFO] Bun version too low, upgrading %BUN% ...
"%BUN%" upgrade
call :BunVersionOk
if not errorlevel 1 exit /b 0

call :InstallBunToNodeInstall
call :BunVersionOk
if errorlevel 1 (
  echo [ERROR] Bun         package.json packageManager   
  pause
  exit /b 1
)
exit /b 0

:InstallBunToNodeInstall
where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] System Bun not found, cannot install to %BUN_DIR%
  exit /b 1
)
echo [INFO] Syncing system Bun to %BUN_DIR% ...
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
