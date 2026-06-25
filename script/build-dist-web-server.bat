@echo off
setlocal
cd /d "%~dp0.."

set "OUT=%CD%\distWebServer"
set "WEB=%CD%\web"

if exist "%OUT%\server\_pack" rmdir /s /q "%OUT%\server\_pack" 2>nul
if exist "%OUT%\work" rmdir /s /q "%OUT%\work" 2>nul

echo === Build distWebServer ===
echo   Output: %OUT%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  pause
  exit /b 1
)

cd /d "%WEB%"
if not exist node_modules (
  echo [INFO] npm install ...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Building web ...
call npm run build
if errorlevel 1 (
  echo [ERROR] web build failed.
  pause
  exit /b 1
)

echo [INFO] Copying web dist ...
if not exist "%OUT%\web" mkdir "%OUT%\web"
xcopy /E /Y /Q "%WEB%\dist\*" "%OUT%\web\" >nul

echo [INFO] Bundling server (mimo.exe only) ...
set "SERVER=%OUT%\server"
if not exist "%SERVER%" mkdir "%SERVER%"
if exist "%SERVER%\_pack" rmdir /s /q "%SERVER%\_pack" 2>nul
set "PACK=%TEMP%\mimo-pack-%RANDOM%"
if exist "%PACK%" rmdir /s /q "%PACK%"
mkdir "%PACK%"
cd /d "%PACK%"
call npm install @mimo-ai/mimocode-windows-x64@0.1.2 --no-save --registry https://registry.npmjs.org
if errorlevel 1 (
  echo [ERROR] failed to download mimocode-windows-x64.
  cd /d "%OUT%"
  rmdir /s /q "%PACK%" 2>nul
  pause
  exit /b 1
)
set "MIMO_SRC="
for /r "%PACK%\node_modules" %%F in (mimo.exe) do set "MIMO_SRC=%%F"
if not defined MIMO_SRC (
  echo [ERROR] mimo.exe not found in package.
  cd /d "%OUT%"
  rmdir /s /q "%PACK%" 2>nul
  pause
  exit /b 1
)
copy /Y "%MIMO_SRC%" "%SERVER%\mimo.exe" >nul
copy /Y "%~dp0standalone\mimo-config.json" "%SERVER%\mimo-config.json" >nul
copy /Y "%~dp0standalone\mimo-auth.json" "%SERVER%\mimo-auth.json" >nul
cd /d "%OUT%"
rmdir /s /q "%PACK%"

echo.
echo [OK] distWebServer ready.
echo      Run distWebServer\start.bat to launch.
exit /b 0
