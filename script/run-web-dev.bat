@echo off
title Web 5173
cd /d "%~dp0..\web"
set "VITE_MIMO_WORK_DIR=%~1"
set "VITE_MIMO_WORK_DIR=%VITE_MIMO_WORK_DIR:\=/%"
npm run dev
