@echo off
echo ===================================================
echo   Sunflower Launcher - Start Compilation
echo ===================================================
echo.

set CSC_PATH=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" (
    echo [ERROR] Cannot find .NET Compiler csc.exe at: %CSC_PATH%
    echo Please make sure .NET Framework 4.0 or above is installed.
    exit /b 1
)

echo [1/2] Compiling C# launcher and embedding resources...
"%CSC_PATH%" /target:winexe /optimize+ /r:System.dll /r:System.Core.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:SunflowerLauncher.exe /resource:src\main.py,main.py /resource:src\audioProcessor.py,audioProcessor.py /resource:src\mediaCut.py,mediaCut.py /resource:src\youtubeDownload.py,youtubeDownload.py /resource:src\static\index.html,static.index.html /resource:src\static\style.css,static.style.css /resource:src\static\app.js,static.app.js src\SunflowerLauncher.cs

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Compilation failed!
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   [SUCCESS] Compilation complete: SunflowerLauncher.exe
echo ===================================================
