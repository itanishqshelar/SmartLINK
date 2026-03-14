@echo off
setlocal enabledelayedexpansion

echo.
echo  ============================================================
echo   ContextBridge ^— Backend Setup
echo  ============================================================
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python is not installed or not on PATH.
    echo          Download it from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version 2^>^&1') do set PY_VER=%%i
echo  Found: %PY_VER%
echo.

:: Check pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] pip is not available. Please install pip first.
    pause
    exit /b 1
)

:: Move to the directory containing this script
cd /d "%~dp0"

:: Create virtual environment if it doesn't already exist
if not exist "venv\" (
    echo  [1/4] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo        Done.
) else (
    echo  [1/4] Virtual environment already exists, skipping creation.
)

echo.

:: Activate virtual environment
echo  [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo  [ERROR] Could not activate virtual environment.
    pause
    exit /b 1
)
echo        Done.
echo.

:: Upgrade pip silently
echo  [3/4] Upgrading pip...
python -m pip install --upgrade pip --quiet
echo        Done.
echo.

:: Install dependencies
echo  [4/4] Installing dependencies from requirements.txt...
echo.
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo  [ERROR] Dependency installation failed.
    echo          Check the error messages above and re-run this script.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   Setup complete!
echo  ============================================================
echo.
echo  Next steps:
echo.
echo    1. Copy .env.example to .env
echo       ^> copy .env.example .env
echo.
echo    2. Open .env and fill in:
echo       ^> GEMINI_API_KEY   — get from https://aistudio.google.com/app/apikey
echo.
echo    3. Start the backend server:
echo       ^> start.bat
echo.
pause
