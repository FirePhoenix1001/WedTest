@echo off
cd /d "%~dp0"
title Sunflower Launcher Compiler

echo ===================================================
echo   * Sunflower Launcher C# Compiler *
echo ===================================================
echo.

set CSC_PATH=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" (
    echo [ERROR] csc.exe not found at %CSC_PATH%
    echo Please make sure .NET Framework 4.0 or above is installed.
    if "%1" neq "nopause" pause
    exit /b 1
)

echo [INFO] Compiling src\SunflowerLauncher.cs with resources ...
"%CSC_PATH%" /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:SunflowerLauncher.exe /resource:src\main.py,main.py /resource:src\audioProcessor.py,audioProcessor.py /resource:src\mediaCut.py,mediaCut.py /resource:src\youtubeDownload.py,youtubeDownload.py /resource:src\static\index.html,static.index.html /resource:src\static\style.css,static.style.css /resource:src\static\app.js,static.app.js src\SunflowerLauncher.cs

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo [SUCCESS] SunflowerLauncher.exe compiled successfully!
    echo ===================================================
    echo.
) else (
    echo.
    echo [ERROR] Compilation failed.
    if "%1" neq "nopause" pause
    exit /b %errorlevel%
)
