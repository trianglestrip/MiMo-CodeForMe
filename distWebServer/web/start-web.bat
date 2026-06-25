@echo off
REM Web 静态服务(8000)，由 start.bat 调用
cd /d "%~dp0"
set "WEB_PORT=8000"
set "MIMO_UPSTREAM=http://127.0.0.1:9000"
title Web 8000
node "%~dp0web-server.mjs"
pause