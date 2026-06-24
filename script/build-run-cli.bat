@echo off
REM 构建 script/mimo-run.exe（非 TUI 命令行启动器）

setlocal
set "ROOT=%~dp0.."
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
cd /d "%ROOT%"
bun run packages/opencode/script/build-run-cli.ts
exit /b %ERRORLEVEL%
