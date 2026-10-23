# Image de production de Money (déployée par Dokploy sur le VPS).
FROM node:22-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Applique les migrations Drizzle puis démarre Next.js.
CMD ["sh", "-c", "npx drizzle-kit migrate && npx next start -p 3000 -H 0.0.0.0"]
