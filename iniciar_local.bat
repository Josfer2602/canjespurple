@echo off
echo =======================================================
echo   Iniciando Plataforma BTL (Entorno de Desarrollo)
echo =======================================================

echo.
echo [1/3] Levantando base de datos PostgreSQL en Docker...
docker compose up -d db

echo.
echo Esperando unos segundos para asegurar que la BD este lista...
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Iniciando el Backend en una nueva ventana...
start "BTL Backend" cmd /k "cd backend && npm install && npm run dev"

echo.
echo [3/3] Iniciando el Frontend en una nueva ventana...
start "BTL Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo =======================================================
echo Todo listo!
echo - El Backend se abrira en su propia ventana (Puerto 4005)
echo - El Frontend se abrira en su propia ventana (Vite)
echo =======================================================
pause
