@echo off
REM KN KITCHEN - Quick Verification Script
REM This script checks if both servers are running and configured correctly

echo.
echo ========================================
echo KN KITCHEN - System Verification
echo ========================================
echo.

REM Check if backend is running
echo [1/3] Checking Backend (Port 8000)...
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend is running and healthy
    curl -s http://localhost:8000/health
) else (
    echo ✗ Backend is NOT running on port 8000
    echo   Start it with: python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
)

echo.

REM Check if frontend is running
echo [2/3] Checking Frontend (Port 3000)...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Frontend is running
) else (
    echo ✗ Frontend is NOT running on port 3000
    echo   Start it with: npm run dev
)

echo.

REM Check environment variables
echo [3/3] Checking Configuration Files...
if exist "backend\.env" (
    echo ✓ Backend .env file exists
) else (
    echo ✗ Backend .env file NOT found
)

if exist "frontend\.env.local" (
    echo ✓ Frontend .env.local file exists
) else (
    echo ✗ Frontend .env.local file NOT found
)

echo.
echo ========================================
echo Verification Complete
echo ========================================
echo.
echo Next steps:
echo 1. If backend is not running: cd backend ^&^& python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
echo 2. If frontend is not running: cd frontend ^&^& npm run dev
echo 3. Open browser to: http://localhost:3000
echo.
