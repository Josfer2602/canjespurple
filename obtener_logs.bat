@echo off
echo ===================================================
echo 📥 DESCARGANDO LOGS DEL SERVIDOR...
echo ===================================================
echo.
echo Por favor ingresa la contrasena del servidor si te la pide:
ssh root@178.156.196.20 "cd /root/canjespurple && docker compose logs --tail=100 backend" > server_logs.txt
echo.
echo ===================================================
echo ✅ LOGS DESCARGADOS CON EXITO.
echo ===================================================
pause
