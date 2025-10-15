@echo off
echo Stopping E9 Trainer Bot...
echo.

call npm run pm2:stop
if %errorlevel% neq 0 (
    echo Failed to stop bot!
    pause
    exit /b 1
)

echo.
echo Bot stopped successfully!
echo.
pause
