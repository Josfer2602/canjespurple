@echo off
echo ============================================================
echo   Iniciando Lanzador BTL SaaS Canjes...
echo ============================================================
echo.

REM Ejecutar el script de PowerShell esquivando restricciones de politica de ejecucion
PowerShell.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1"

echo.
pause
