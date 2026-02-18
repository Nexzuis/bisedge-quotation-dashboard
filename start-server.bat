@echo off
echo ========================================
echo    Bisedge Quotation Dashboard
echo    Starting Dev Server on Port 5173
echo ========================================
echo.

cd /d "%~dp0"
call npm run dev

pause
