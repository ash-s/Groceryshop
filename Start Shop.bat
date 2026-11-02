@echo off
title GroceryShop
setlocal

rem ============================================================
rem  GroceryShop - desktop launcher
rem
rem  Double-click this file to start the shop software. It opens
rem  in the browser by itself. Everything runs on this computer:
rem  the program, the database, and every bill.
rem
rem  No internet needed. No IP addresses to type.
rem
rem  To use your phone as a scanner, open the "Phone" panel in
rem  the app and scan the QR code with the phone camera.
rem ============================================================

set "APP_DIR=%~dp0app"
set "JAR=%APP_DIR%\backend-1.0.0.jar"
set "JAVA_EXE=%APP_DIR%\jre\bin\java.exe"
set "DATA_DIR=%~dp0data"
set "PORT=8080"
set "HTTPS_PORT=8443"

if not exist "%JAR%" (
  echo Could not find the shop software:
  echo   %JAR%
  echo.
  pause
  exit /b 1
)

rem Use the bundled Java if present, otherwise the one already on this PC.
if not exist "%JAVA_EXE%" set "JAVA_EXE=java"

rem Everything the shop stores lives in this one folder. To take a backup,
rem copy the whole "data" folder somewhere safe.
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

rem Open the browser a few seconds after the program is up.
start "" cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:%PORT%"

echo Starting GroceryShop...
echo.
echo   App in browser : http://localhost:%PORT%
echo   Phone on Wi-Fi : scan the QR code shown in the app
echo.
echo Keep this window open while the shop is running.
echo Closing this window stops the shop software.
echo.

"%JAVA_EXE%" -Duser.dir="%DATA_DIR%" -jar "%JAR%" --server.port=%PORT% --app.https.port=%HTTPS_PORT%

pause
