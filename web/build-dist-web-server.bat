@echo off
REM 构建 distWebServer 绿色版前端（仅更新 web/，不改动 server/mimo.exe）
cd /d "%~dp0"
set "OUT=%~dp0..\distWebServer"

REM 检查 Node.js 与依赖，然后构建
where node >nul 2>&1 || (echo [ERROR] 未找到 Node.js & pause & exit /b 1)
if not exist node_modules (echo [ERROR] 缺少 node_modules，请先在 web 目录执行 npm install & pause & exit /b 1)
call npm run build || (echo [ERROR] 构建失败 & pause & exit /b 1)

REM 复制 dist 到 distWebServer\web
if not exist "%OUT%\web" mkdir "%OUT%\web"
xcopy /E /Y /Q "dist\*" "%OUT%\web\" >nul
echo [OK] 构建完成，运行 distWebServer\start.bat 启动