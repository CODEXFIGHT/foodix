@echo off
REM FoodIX - Agente de impresion local (Windows)
REM Doble clic para iniciar. Deja la ventana abierta mientras uses la caja.

title FoodIX - Agente de impresion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [ERROR] No se encontro Node.js.
  echo  Instalalo desde https://nodejs.org  ^(version LTS^) y vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

node agent.js
echo.
echo  El agente se detuvo. Presiona una tecla para cerrar.
pause >nul
