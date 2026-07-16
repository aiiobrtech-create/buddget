# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend install
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4072
# Na VPS: defina no .env SESSION pooler ou SUPABASE_POOLER_HOST (Connect do Supabase).
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/frontend/dist ./frontend/dist
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package*.json ./
EXPOSE 4072
CMD ["node", "dist/main/server.js"]
