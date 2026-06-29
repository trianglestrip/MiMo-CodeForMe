@echo off
REM Build mimocode-windows-x64 serve binary (single platform)
setlocal
set "ROOT=%~dp0.."
cd /d "%ROOT%"

set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
where bun >nul 2>&1
if errorlevel 1 (
  echo [ERROR] bun not found. Install: npm install -g bun
  exit /b 1
)

echo [1/2] bun install ...
bun install
if errorlevel 1 exit /b 1

echo [2/2] build serve (--single) ...
cd /d "%ROOT%\packages\opencode"
bun run build -- --single
exit /b %ERRORLEVEL%
