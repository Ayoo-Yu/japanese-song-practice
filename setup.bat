@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo =========================================
echo    Japanese Song Practice - Setup
echo =========================================
echo.

REM --- Node.js: install or upgrade ---
call :check_node
if errorlevel 1 goto :done

REM --- pnpm ---
call :check_pnpm
if errorlevel 1 goto :done

REM --- Dependencies ---
echo.
echo [INFO] Installing dependencies...
call pnpm install
if errorlevel 1 (
    echo [ERROR] Dependency install failed.
    goto :done
)

REM --- .env ---
if not exist ".env" (
    if not exist ".env.example" (
        echo [ERROR] .env.example not found.
        goto :done
    )
    echo.
    echo [INFO] Creating .env from .env.example
    copy ".env.example" ".env" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to create .env.
        goto :done
    )
    echo.
    echo [OK] .env created.
) else (
    echo [OK] .env already exists, skipping
)

echo.
echo =========================================
echo    Setup Complete!
echo =========================================
echo.
echo   NetEase Login: Open Settings page after dev server starts
echo.

call pnpm dev -- --open

:done
echo.
pause
endlocal
exit /b

REM === Subroutines ===

:check_node
where node >nul 2>&1
if errorlevel 1 (
    echo [INFO] Node.js not found, installing...
    call :install_node
    if errorlevel 1 exit /b 1
)

echo [OK] Node.js
node -v

REM Check version (need 20.19+ or 22.12+)
set "NEED_UPGRADE=0"
for /f "tokens=1,2 delims=." %%a in ('node -v 2^>nul') do (
    set "NODE_MAJOR=%%a"
    set "NODE_MINOR=%%b"
)
set "NODE_MAJOR=%NODE_MAJOR:v=%"

if %NODE_MAJOR% LSS 20 set "NEED_UPGRADE=1"
if "%NODE_MAJOR%"=="20" if %NODE_MINOR% LSS 19 set "NEED_UPGRADE=1"
if "%NODE_MAJOR%"=="22" if %NODE_MINOR% LSS 12 set "NEED_UPGRADE=1"

if "%NEED_UPGRADE%"=="1" (
    echo [INFO] Node.js version too old, upgrading...
    call :install_node
    if errorlevel 1 exit /b 1
    echo [OK] Node.js upgraded.
    node -v
)
exit /b 0

:install_node
set "NODE_VERSION=22.16.0"
where winget >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Upgrading via winget...
    winget upgrade OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >nul 2>&1
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements >nul 2>&1
) else (
    echo [INFO] Downloading Node.js %NODE_VERSION%...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi' -OutFile \"$env:TEMP\\node-install.msi\""
    if errorlevel 1 (
        echo [ERROR] Failed to download Node.js.
        exit /b 1
    )
    echo [INFO] Installing...
    msiexec /i "%TEMP%\node-install.msi" /passive /norestart
    if errorlevel 1 (
        echo [ERROR] Node.js installer failed.
        del "%TEMP%\node-install.msi" >nul 2>&1
        exit /b 1
    )
    del "%TEMP%\node-install.msi" >nul 2>&1
)
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js still not found after install.
    echo         Please install manually: https://nodejs.org/
    exit /b 1
)
exit /b 0

:check_pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm not found, installing...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] pnpm install failed.
        exit /b 1
    )
)
echo [OK] pnpm
call pnpm -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] pnpm is installed but could not be executed.
    exit /b 1
)
exit /b 0
