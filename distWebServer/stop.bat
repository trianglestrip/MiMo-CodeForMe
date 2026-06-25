@echo off
REM 停止 MiMo API(4096) 与 Web(5173)
REM 用法: stop.bat  可选 /q 静默模式
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":4096" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
if /i not "%~1"=="/q" echo [OK] 已停止
