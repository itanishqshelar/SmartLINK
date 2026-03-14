@echo off
title ContextBridge Backend
color 0B

echo.
echo  ============================================================
echo   ContextBridge Backend  ^|  AI Document Intelligence
echo  ============================================================
echo.

cd /d "%~dp0"

REM ── Check Python is available ─────────────────────────────────────────────
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python not found. Please install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

REM ── Check .env exists ─────────────────────────────────────────────────────
if not exist ".env" (
    echo  [WARN]  .env file not found.
    echo          Copying .env.example to .env — please fill in your API keys!
    echo.
    copy ".env.example" ".env" >nul
)

REM ── Install / upgrade dependencies ────────────────────────────────────────
echo  [INFO]  Checking dependencies...
pip install -r requirements.txt --quiet --disable-pip-version-check
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Dependency installation failed. Check requirements.txt.
    pause
    exit /b 1
)
echo  [INFO]  Dependencies OK.
echo.

REM ── Create required directories ───────────────────────────────────────────
if not exist "data"    mkdir data
if not exist "uploads" mkdir uploads

REM ── Start the server ──────────────────────────────────────────────────────
echo  [INFO]  Starting FastAPI server on http://localhost:8000
echo  [INFO]  API docs available at http://localhost:8000/docs
echo  [INFO]  Press Ctrl+C to stop.
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
