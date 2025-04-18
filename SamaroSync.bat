@echo off
setlocal enableextensions

rem SamaroSync.bat - Launcher for SamaroSync application
rem This helps Windows resolve path issues with shortcuts

rem Determine location of this script
set SCRIPT_DIR=%~dp0

rem Log startup for debugging
echo [%date% %time%] Starting SamaroSync from batch file >> "%TEMP%\SamaroSync_launcher.log"
echo [%date% %time%] Script directory: %SCRIPT_DIR% >> "%TEMP%\SamaroSync_launcher.log"

rem Set the executable path
set EXE_PATH=%SCRIPT_DIR%SamaroSync.exe

rem Check if executable exists
if not exist "%EXE_PATH%" (
    echo [%date% %time%] ERROR: Executable not found at %EXE_PATH% >> "%TEMP%\SamaroSync_launcher.log"
    echo SamaroSync.exe not found. Please reinstall the application.
    pause
    exit /b 1
)

echo [%date% %time%] Launching: %EXE_PATH% >> "%TEMP%\SamaroSync_launcher.log"

rem Launch the application
start "" "%EXE_PATH%" %*

endlocal
exit /b 0 