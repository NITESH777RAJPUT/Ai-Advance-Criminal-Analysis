@echo off
title CRIMENET Launcher
echo ============================================================
echo   Starting AI-Powered Criminal Network Analysis Platform
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8001 ...
start "CRIMENET Backend (FastAPI)" cmd /k "cd backend && ..\.venv312\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001"

echo [2/2] Starting React + Vite Frontend on http://127.0.0.1:5174 ...
start "CRIMENET Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo All services launched in separate windows!
echo Web Application: http://localhost:5174
echo API Docs:        http://localhost:8001/docs
echo.
timeout /t 5 /nobreak >nul 2>&1
start http://localhost:5174
