@echo off
setlocal
echo === Stop MiMoCode Web ===

for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":4096" ^| findstr "LISTENING"') do (
  echo [INFO] Kill PID %%P on port 4096
  taskkill /F /PID %%P >nul 2>&1
)

for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
  echo [INFO] Kill PID %%P on port 5173
  taskkill /F /PID %%P >nul 2>&1
)

echo [OK] Done.
exit /b 0
