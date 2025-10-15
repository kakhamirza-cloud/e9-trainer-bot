@echo off
echo Starting E9 Trainer Bot with PM2...
echo.

echo Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Starting bot with PM2...
call npm run pm2:start
if %errorlevel% neq 0 (
    echo Failed to start with PM2!
    pause
    exit /b 1
)

echo.
echo Bot started successfully!
echo Use 'npm run pm2:logs' to view logs
echo Use 'npm run pm2:status' to check status
echo Use 'npm run pm2:stop' to stop the bot
echo.
pause
