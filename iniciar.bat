@echo off
:: El Launcher de Python abre el puerto "%PORT%" en el navegador por defecto.
:: Por lo tanto, vamos a intercambiar los puertos para engañar al Launcher:
:: Haremos que Vite (Frontend) use %PORT% y el Backend use %VITE_PORT%.

set REAL_BACKEND_PORT=%VITE_PORT%
set REAL_FRONTEND_PORT=%PORT%

echo Iniciando servidor Backend en el puerto %REAL_BACKEND_PORT%...
cd backend
:: Asignamos el puerto real del backend para que NodeJS lo lea
set PORT=%REAL_BACKEND_PORT%
start /B cmd /c "npm run dev"
cd ..

echo Esperando unos segundos para inicializar backend...
ping 127.0.0.1 -n 4 > nul

echo Iniciando servidor Frontend en el puerto %REAL_FRONTEND_PORT%...
cd frontend
:: Vinculamos dinámicamente el frontend con el puerto real del backend
set VITE_API_URL=http://localhost:%REAL_BACKEND_PORT%/api

:: Le decimos a Vite que use el puerto asignado para el Frontend (el que abre el navegador)
npm run dev -- --port %REAL_FRONTEND_PORT%
