@echo off
REM Web 静态服务(5173)，由 start.bat 调用
cd /d "%~dp0"
title Web 5173
node "%~dp0web-server.mjs"
pause
