@echo off
REM 从源码目录启动 distWebServer 打包版（委托 distWebServer\start.bat）
setlocal
cd /d "%~dp0.."

if not exist "distWebServer\server\mimo.exe" (
  echo [ERROR] 找不到 distWebServer\server\mimo.exe
  echo        请先运行 buildserve.bat 或 AgentServer\build-mimo.bat
  pause
  exit /b 1
)

call "distWebServer\start.bat"
exit /b %ERRORLEVEL%
