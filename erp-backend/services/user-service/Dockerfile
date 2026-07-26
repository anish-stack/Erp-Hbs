FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl tini openssl

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/user-service/package.json ./services/user-service/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY services/user-service ./services/user-service

WORKDIR /app/services/user-service
RUN npx prisma generate && mkdir -p storage/exports storage/imports

ENV NODE_ENV=production
EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4002/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
