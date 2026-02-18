@echo off
echo ========================================
echo Bisedge Quotation Dashboard
echo ========================================
echo.
echo Starting development server...
echo.
echo The application will open automatically in your browser.
echo Press Ctrl+C to stop the server.
echo.

cd /d "%~dp0"
npm run dev

pause
