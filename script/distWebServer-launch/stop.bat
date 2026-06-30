@echo off
chcp 65001 >nul 2>&1
REM 停止 distWebServer MiMo serve (4096)；完整停服请用 AgentServer\Stop.bat
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":4096" ^| findstr LISTENING') do taskkill /F /PID %%P >nul 2>&1
taskkill /F /IM mimo.exe >nul 2>&1
if /i not "%~1"=="/q" (
  echo [OK] MiMo 4096 已停止
)
exit /b 0
