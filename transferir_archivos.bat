@echo off
echo ===================================================
echo 📤 ENVIANDO ARCHIVOS SECRETOS AL NUEVO SERVIDOR...
echo ===================================================
echo.
echo NOTA: Si te pide la contrasena, es la del servidor. Puede pedirla hasta 3 veces.
echo.
echo [1/3] Copiando service-account.json...
type backend\service-account.json | ssh root@178.156.196.20 "cat > /root/canjespurple/backend/service-account.json"
echo.
echo [2/3] Copiando archivo .env...
type backend\.env | ssh root@178.156.196.20 "cat > /root/canjespurple/backend/.env"
echo.
echo [3/3] Reconstruyendo la aplicacion para aplicar los archivos...
ssh root@178.156.196.20 "cd /root/canjespurple && docker compose build --no-cache backend && docker compose up -d"
echo.
echo ===================================================
echo ✅ ARCHIVOS TRANSFERIDOS CON EXITO
echo ===================================================
pause
