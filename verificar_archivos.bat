@echo off
echo ===================================================
echo 📥 VERIFICANDO ARCHIVOS EN EL CONTENEDOR...
echo ===================================================
echo.
echo Por favor ingresa la contrasena del servidor si te la pide:
ssh root@178.156.196.20 "docker compose exec backend ls -la" > files_in_container.txt
echo.
echo ===================================================
echo ✅ VERIFICACION COMPLETADA.
echo ===================================================
pause
