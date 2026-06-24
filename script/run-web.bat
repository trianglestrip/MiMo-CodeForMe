@echo off
REM MiMoCode Web 单机模式 (serve + dev:web)
REM
REM 用法:
REM   script\run-web.bat
REM   script\run-web.bat --dir D:\gitProject\my-app
REM   script\run-web.bat --no-open
REM
REM 前端: http://localhost:3000
REM 后端: http://localhost:4096

setlocal
set "ROOT=%~dp0.."
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
cd /d "%ROOT%"
bun run packages/opencode/script/run-web.ts %*
exit /b %ERRORLEVEL%
