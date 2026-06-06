#!/bin/bash

echo "🚀 Iniciando actualización y despliegue del sistema..."

# 1. Asegurarnos de tener el código más reciente
echo "📥 Descargando últimos cambios..."
git fetch --all
git reset --hard origin/main

# 2. Reconstruir el frontend sin caché para evitar errores antiguos
echo "🔨 Reconstruyendo el frontend limpiamente (esto tomará unos minutos)..."
docker compose build --no-cache frontend

# 3. Levantar todos los contenedores
echo "🐳 Levantando contenedores..."
docker compose up -d

# 4. Darle unos segundos a la base de datos para estar lista
echo "⏳ Esperando 10 segundos a que la base de datos inicie..."
sleep 10

# 5. Asegurar las tablas de la base de datos
echo "🗄️ Configurando base de datos..."
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma db seed

echo "✅ ¡Despliegue completado con éxito! Ya puedes probar iniciar sesión."
