@echo off
title Gia Pha Dong Ho - Next.js Server
echo ==========================================
echo Starting Gia Pha Dong Ho (Family Tree App)
echo ==========================================
echo.
echo 1. Checking and killing existing port 3000...
call npx kill-port 3000
echo.
echo 2. Checking dependencies...
if not exist node_modules (
    echo - node_modules not found. Installing dependencies...
    call npm install 
) else (
    echo - Dependencies already installed. Skipping.
)
echo.
echo 3. Starting the development server...
echo Please wait until you see "Ready in ..." 
echo then open http://localhost:3000 in your browser.
echo.
call npm run dev
pause
