@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo =========================================
echo    Japanese Song Practice - Setup
echo =========================================
echo.

REM Install Node.js if missing
where node >nul 2>&1
if errorlevel 1 (
    echo [INFO] Node.js not found, installing...

    where winget >nul 2>&1
    if not errorlevel 1 (
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    ) else (
        echo [INFO] Downloading Node.js installer...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi' -OutFile \"$env:TEMP\\node-install.msi\""
        if errorlevel 1 (
            echo [ERROR] Failed to download Node.js installer.
            goto :done
        )

        echo [INFO] Running installer...
        msiexec /i "%TEMP%\node-install.msi" /passive /norestart
        if errorlevel 1 (
            echo [ERROR] Node.js installer failed.
            goto :done
        )

        del "%TEMP%\node-install.msi" >nul 2>&1
    )

    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    where node >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [ERROR] Node.js install failed. Please install manually:
        echo         https://nodejs.org/
        goto :done
    )
)

echo [OK] Node.js
node -v

REM Check Node.js version (need 20.19+ or 22.12+)
for /f "tokens=1,2 delims=." %%a in ('node -v 2^>nul') do (
    set "NODE_MAJOR=%%a"
    set "NODE_MINOR=%%b"
)
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if "%NODE_MAJOR%"=="20" (
    if %NODE_MINOR% LSS 19 (
        echo [ERROR] Node.js 20.19+ required, you have 20.%NODE_MINOR%.x
        echo         Please upgrade: https://nodejs.org/
        goto :done
    )
)
if "%NODE_MAJOR%"=="22" (
    if %NODE_MINOR% LSS 12 (
        echo [ERROR] Node.js 22.12+ required, you have 22.%NODE_MINOR%.x
        echo         Please upgrade: https://nodejs.org/
        goto :done
    )
)
if %NODE_MAJOR% LSS 20 (
    echo [ERROR] Node.js 20+ required, you have %NODE_MAJOR%.x
    echo         Please upgrade: https://nodejs.org/
    goto :done
)

REM Install pnpm if missing
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm not found, installing...
    call npm install -g pnpm
    if errorlevel 1 (
        echo [ERROR] pnpm install failed.
        goto :done
    )
)

echo [OK] pnpm
call pnpm -v
if errorlevel 1 (
    echo [ERROR] pnpm is installed but could not be executed.
    goto :done
)

REM Install dependencies
echo.
echo [INFO] Installing dependencies...
call pnpm install
if errorlevel 1 (
    echo [ERROR] Dependency install failed.
    goto :done
)

REM Configure environment
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
echo   Start dev server:  pnpm dev
echo   Build:             pnpm build
echo   Type check:        npx tsc --noEmit
echo   Edit env:          notepad .env
echo.
echo   NetEase Login: Open Settings page in browser after dev server starts
echo.

call pnpm dev -- --open

:done
echo.
pause
endlocal
