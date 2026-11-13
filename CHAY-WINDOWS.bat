@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Chua co Node.js. Hay cai Node.js 18 tro len tai https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo ==========================================
echo   MA SOI ONLINE - 5 den 30 nguoi
 echo ==========================================
echo   Website: http://localhost:3000
 echo   Nhan Ctrl + C de dung may chu.
echo.
start "" "http://localhost:3000"
node server.js
pause
