@echo off
REM ?? MiMo API(4096) ?? Web(8000)
REM ?¡Â?: stop.bat  ??? /q ?????
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":4096" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
if /i not "%~1"=="/q" echo [OK] ????