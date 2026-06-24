@echo off
REM MiMoCode 非 TUI 命令行模式（优先使用 mimo-run.exe）
REM
REM 构建 exe:
REM   script\build-run-cli.bat
REM
REM 用法:
REM   script\run-cli.bat "你的问题"
REM   script\mimo-run.exe "你的问题"

setlocal
set "ROOT=%~dp0.."
set "SCRIPT_DIR=%~dp0"
set "PATH=%APPDATA%\npm;%USERPROFILE%\.bun\bin;%PATH%"
cd /d "%ROOT%"

if exist "%SCRIPT_DIR%mimo-run.exe" (
  "%SCRIPT_DIR%mimo-run.exe" %*
  exit /b %ERRORLEVEL%
)

bun run packages/opencode/script/run-cli.ts %*
exit /b %ERRORLEVEL%
