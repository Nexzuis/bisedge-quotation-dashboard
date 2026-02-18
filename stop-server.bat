@echo off
echo ========================================
echo    Stopping Dev Server
echo ========================================
echo.

echo Killing processes on port 5173...
npx kill-port 5173

echo.
echo Server stopped!
pause
