@echo off
setlocal enabledelayedexpansion

title GressPay - One Click GitHub Push
color 0B
echo ===================================================
echo        GressPay One-Click GitHub Push Tool
echo    Target: https://github.com/extshefat/GressPay
echo ===================================================
echo.

cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" (
    set /p "MSG=Enter commit message (Press Enter for auto-date): "
)
if "%MSG%"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set dt=%%I
    set "MSG=feat: update GressPay codebase (!dt:~0,4!-!dt:~4,2!-!dt:~6,2! !dt:~8,2!:!dt:~10,2!)"
)

git config user.name "EXT SHEFAT"
git config user.email "tradershefat8@gmail.com"

git status --porcelain > "%TEMP%\gp_status.tmp"
for %%R in ("%TEMP%\gp_status.tmp") do if %%~zR==0 (
    color 0A
    echo [OK] No changes to push. Repository is already up to date.
    del "%TEMP%\gp_status.tmp" 2>nul
    goto :done
)
del "%TEMP%\gp_status.tmp" 2>nul

echo [*] Staging all files...
git add -A

echo [*] Committing: "!MSG!"...
git commit -m "!MSG!"

echo [*] Pushing to GitHub (origin main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    color 0A
    echo.
    echo ===================================================
    echo      SUCCESSFULLY PUSHED TO GITHUB!
    echo   URL: https://github.com/extshefat/GressPay/tree/main
    echo ===================================================
) else (
    color 0C
    echo.
    echo [ERROR] Push failed. Check your network or git credentials.
)

:done
echo.
pause
