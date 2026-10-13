# Imagem única da Redes Intranet: build do frontend (React + Vite) servido pelo backend (Express).

# 1. Build do frontend
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Dependências de produção do backend
FROM node:22-alpine AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# 3. Imagem final
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3000 \
    STATIC_DIR=/app/public \
    SHARE_ADMIN_DIR=/compartilhamento/admin \
    SHARE_GERAL_DIR=/compartilhamento/geral
WORKDIR /app

COPY --from=backend-deps /app/node_modules ./node_modules
COPY backend/package.json ./
COPY backend/src ./src
COPY --from=frontend /build/dist ./public

# A aplicação roda com o usuário "node" (UID 1000), que precisa de escrita nas pastas compartilhadas.
RUN mkdir -p /compartilhamento/admin /compartilhamento/geral \
    && chown -R node:node /compartilhamento
USER node

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
