@echo off
REM 从源码目录启动 distWebServer 打包版（委托 run-mimo.bat）
setlocal
cd /d "%~dp0.."

if not exist "distWebServer\server\mimo.exe" (
  echo [ERROR] 找不到 distWebServer\server\mimo.exe
  echo        请先运行 buildserve.bat 或 AgentServer\build-mimo.bat
  pause
  exit /b 1
)

call "distWebServer\server\run-mimo.bat"
exit /b %ERRORLEVEL%
