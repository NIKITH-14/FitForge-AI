@echo off
title FitForge AI - Launcher
color 0A

echo.
echo  ==========================================
echo   FitForge AI - Starting Platform...
echo  ==========================================
echo.

:: ── Install backend deps if needed ──────────────────────
echo [1/4] Checking backend dependencies...
cd /d "%~dp0backend"
if not exist node_modules (
    echo       Installing backend packages...
    npm install
)

:: ── Install frontend deps if needed ─────────────────────
echo [2/4] Checking frontend dependencies...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo       Installing frontend packages...
    npm install
)

:: ── Launch backend in new window ─────────────────────────
echo [3/4] Starting Backend API on http://localhost:5000 ...
start "FitForge AI - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: ── Wait a moment then launch frontend ───────────────────
timeout /t 2 /nobreak >nul
echo [4/4] Starting Frontend on http://localhost:3000 ...
start "FitForge AI - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ==========================================
echo   Both servers are starting!
echo.
echo   Backend  ->  http://localhost:5000
echo   Frontend ->  http://localhost:3000
echo  ==========================================
echo.
echo  Open http://localhost:3000 in your browser.
echo  Press any key to close this launcher...
pause >nul
