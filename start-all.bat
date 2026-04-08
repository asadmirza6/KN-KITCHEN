@echo off
REM KN KITCHEN - Complete Startup Script for Windows
REM This script starts both backend and frontend in separate windows

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo KN KITCHEN - Full Stack Startup
echo ==========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to PATH
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and add it to PATH
    pause
    exit /b 1
)

echo [OK] Python and Node.js are installed
echo.

REM Start Backend in new window
echo Starting Backend on http://127.0.0.1:8000...
start "KN KITCHEN Backend" cmd /k "cd /d %cd%\backend && python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000"

REM Wait for backend to start
echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak

REM Start Frontend in new window
echo Starting Frontend on http://localhost:3000...
start "KN KITCHEN Frontend" cmd /k "cd /d %cd%\frontend && npm run dev"

echo.
echo ==========================================
echo Startup Complete!
echo ==========================================
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Opening browser to http://localhost:3000...
timeout /t 3 /nobreak

REM Open browser
start http://localhost:3000

echo.
echo Both servers are running in separate windows.
echo Close the windows to stop the servers.
echo.
pause
