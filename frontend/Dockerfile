# Etapa de construcción
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Construir el frontend con Vite
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar los estáticos generados
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx para manejar el enrutamiento de React (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
