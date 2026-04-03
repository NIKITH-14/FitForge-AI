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

:: ── Database Backup ───────────────────────────────────────
echo [3/5] Backing up the database (keeping last 7 days)...
cd /d "%~dp0backend"
if not exist "backups" mkdir "backups"
powershell -Command "$d = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'; if (Test-Path '..\fitness_platform.db') { Copy-Item -Path '..\fitness_platform.db' -Destination \"backups\fitness_platform_$d.db\" } elseif (Test-Path 'fitness_platform.db') { Copy-Item -Path 'fitness_platform.db' -Destination \"backups\fitness_platform_$d.db\" }"
powershell -Command "Get-ChildItem -Path 'backups' -Filter '*.db' | Sort-Object CreationTime -Descending | Select-Object -Skip 7 | Remove-Item -Force"

:: ── Launch backend in new window ─────────────────────────
echo [4/5] Starting Backend API on http://localhost:5000 ...
cd /d "%~dp0"
start "FitForge AI - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: ── Wait 5 seconds then launch frontend ──────────────────
echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul
echo [5/5] Starting Frontend on http://localhost:3000 ...
start "FitForge AI - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ── Launch Kiosk Mode ────────────────────────────────────
echo Waiting 8 seconds for frontend to compile...
timeout /t 8 /nobreak >nul
echo Launching Kiosk Mode...
start chrome --kiosk --fullscreen --no-sandbox --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state http://localhost:3000

echo.
echo  ==========================================
echo   FitForge AI v1.0 is running!
echo  ==========================================
echo.
echo  Press any key to close this launcher...
pause >nul
