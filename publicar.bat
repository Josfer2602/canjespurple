@echo off
echo ===================================================
echo 🚀 INICIANDO PUBLICACION DE LA APP EN EL SERVIDOR
echo ===================================================
echo.

echo [1/3] Guardando todos los cambios locales...
git add .
set /p commit_msg="Escribe un mensaje corto para estos cambios (ej: Arreglo de botones): "
if "%commit_msg%"=="" set commit_msg="Actualizacion automatica"
git commit -m "%commit_msg%"
echo.

echo [2/3] Subiendo cambios a GitHub...
git push origin main
echo.

echo [3/3] Conectando al servidor y actualizando la app...
echo (Se te podria pedir la contrasena de tu servidor)
ssh root@178.156.196.20 "cd /root/canjespurple && bash deploy.sh"

echo.
echo ===================================================
echo ✅ PUBLICACION COMPLETADA CON EXITO
echo ===================================================
pause
