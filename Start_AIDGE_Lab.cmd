@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20.19+ or 22.12+ is required.
  echo Install Node.js from https://nodejs.org/ then launch this file again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing simulator dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
start "AIDGE Hardware Lab server" /D "%~dp0" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:5173/"
