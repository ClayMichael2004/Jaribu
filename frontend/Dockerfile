# Stage 1: Build the static web app using Node & Expo Web
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source
COPY . .

# Build web distribution bundle
RUN npx expo export --platform web

# Stage 2: High-performance Nginx static web server
FROM nginx:alpine

# Copy nginx configuration
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location /api/ {\n\
        proxy_pass http://backend:8080/api/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_cache_bypass $http_upgrade;\n\
    }\n\
\n\
    location /ws/ {\n\
        proxy_pass http://backend:8080/ws/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "Upgrade";\n\
        proxy_set_header Host $host;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

# Copy static assets from build stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
