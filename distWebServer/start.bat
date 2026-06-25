@echo off
REM 一键启动 MiMo API + Web（绿色版）
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%CD%"

where node >nul 2>&1 || (echo [ERROR] 未找到 Node.js & pause & exit /b 1)
if not exist "%ROOT%\server\mimo.exe" (echo [ERROR] 缺少 server\mimo.exe，请先运行 web\build-dist-web-server.bat & pause & exit /b 1)

call "%~dp0stop.bat" /q

start "MiMo 4096" cmd /k call "%ROOT%\server\run-mimo.bat"
timeout /t 2 /nobreak >nul
start "Web 5173" cmd /k call "%ROOT%\web\start-web.bat"

echo [INFO] 等待 MiMo serve ...
set /a _W=0
:WaitMimo
curl -s http://127.0.0.1:4096/global/health 2>nul | findstr /C:"healthy" >nul 2>&1
if not errorlevel 1 goto MimoReady
set /a _W+=1
if !_W! GEQ 45 goto MimoFail
timeout /t 1 /nobreak >nul
goto WaitMimo

:MimoFail
echo [WARN] MiMo serve 未就绪，请查看「MiMo 4096」窗口是否有报错
goto Done

:MimoReady
echo [OK] MiMo serve 就绪

:Done
echo [OK] http://127.0.0.1:5173/  Trace: /trace.html
echo      工作目录请在 Web 顶部栏设置
exit /b 0
