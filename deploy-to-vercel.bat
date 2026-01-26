@echo off
REM Restaurant Task Manager - Deploy to Vercel Script (Windows)
REM Run this script to deploy your app to Vercel

echo.
echo ====================================================
echo   Restaurant Task Manager - Vercel Deployment
echo ====================================================
echo.

REM Step 1: Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    call git init
) else (
    echo ✓ Git repository already initialized
)

REM Step 2: Commit code
echo.
echo Preparing code for deployment...
call git add .
call git commit -m "Restaurant Task Manager - Ready for Vercel"

REM Step 3: Check if Vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Installing Vercel CLI...
    call npm install -g vercel
)

REM Step 4: Deploy
echo.
echo ==================================================
echo   Starting Vercel Deployment...
echo ==================================================
echo.
echo Follow the prompts to:
echo   1. Link to GitHub (or create new project)
echo   2. Set project name
echo   3. Deploy your app
echo.
echo Configure environment variables after:
echo   - JWT_SECRET (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo   - NODE_ENV = production
echo.

call vercel

echo.
echo ====================================================
echo   Deployment Complete!
echo ====================================================
echo.
echo Your app is now live at: https://[your-project].vercel.app
echo.
echo Next steps:
echo   1. Set environment variables in Vercel dashboard
echo   2. Test your app
echo   3. Share the URL!
echo.
pause
