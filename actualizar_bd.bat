@echo off
echo ===================================================
echo 🛠️ ACTUALIZANDO BASE DE DATOS EN EL SERVIDOR
echo ===================================================
echo.
echo Conectando al servidor para forzar la actualizacion de las tablas...
echo (Se te pedira la contrasena del servidor)
ssh root@178.156.196.20 "cd /root/canjespurple && docker compose exec backend npx prisma db push"
echo.
echo ===================================================
echo ✅ ACTUALIZACION COMPLETADA.
echo Por favor, refresca la pagina en tu navegador (Ctrl + F5 o borrar cache)
echo e intenta nuevamente.
echo ===================================================
pause
