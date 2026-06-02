@echo off
cd /d "%~dp0"
title Sunflower Web Studio Launcher

echo ===================================================
echo   * Sunflower Web Studio Launcher *
echo ===================================================
echo.

:: 1. Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Python is not detected on your computer.
    echo We will automatically download and install Python 3.11 for you.
    echo.
    echo Option 1: Trying to install via Windows Package Manager winget...
    winget install Python.Python.3.11 --accept-source-agreements --accept-package-agreements --silent
    if %errorlevel% equ 0 (
        goto PythonInstalledSuccess
    )
    
    echo.
    echo Option 2: Winget failed or not available. Downloading Python installer...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile 'python_setup.exe'"
    
    echo Installing Python silently, this may take a minute...
    start /wait python_setup.exe /quiet InstallAllUsers=0 PrependPath=1 Include_test=0
    del python_setup.exe
    
    :PythonInstalledSuccess
    echo.
    echo ===================================================
    echo [SUCCESS] Python has been successfully installed!
    echo.
    echo IMPORTANT: Please CLOSE this window and double-click
    echo this batch file again to initialize the application.
    echo ===================================================
    pause
    exit
)

:: 2. Check and install dependencies
echo Checking Python libraries...
python -c "import flask, flask_cors, yt_dlp, faster_whisper, opencc" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing required Python libraries like Flask, yt-dlp, whisper, etc...
    echo This might take a few minutes. Please wait...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python libraries. Please check your internet connection.
        pause
        exit
    )
    echo [SUCCESS] Dependencies installed successfully!
    echo.
)

:: 3. Launch the browser and server
echo Opening browser to GitHub Pages...
start https://FirePhoenix1001.github.io/WedTest/
echo.
echo Starting local Python backend server...
echo [INFO] Keep this window open during downloads, cuts, and transcriptions.
echo [INFO] Closing this window will stop the backend server.
echo.
python src/main.py

:: 4. Post-Server cleanup sequence (Triggers only if uninstall.flag is written by the server)
if exist uninstall.flag (
    echo.
    echo ===================================================
    echo   * Uninstall request detected! Cleaning up...
    echo ===================================================
    del uninstall.flag >nul 2>&1
    
    echo [1/4] Deleting downloaded media and text files...
    for %%f in (*.mp4 *.mkv *.webm *.mov *.avi *.mp3 *.wav *.m4a *.txt) do (
        del "%%f" >nul 2>&1
    )
    
    echo [2/4] Deleting FFmpeg and FFprobe binaries...
    del tools\ffmpeg.exe >nul 2>&1
    del tools\ffprobe.exe >nul 2>&1
    del ffmpeg.exe >nul 2>&1
    del ffprobe.exe >nul 2>&1
    
    echo [3/4] Uninstalling Python packages pip modules...
    pip uninstall -y flask flask-cors yt-dlp faster-whisper opencc-python-reimplemented >nul 2>&1
    
    echo [4/4] Uninstalling Python 3.11...
    winget uninstall Python.Python.3.11 --silent >nul 2>&1
    
    echo.
    echo ===================================================
    echo [SUCCESS] Cleanup completed successfully!
    echo Python, libraries, media, and tools have been uninstalled.
    echo ===================================================
    pause
    exit
)
