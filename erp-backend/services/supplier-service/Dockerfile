FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl tini openssl

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/supplier-service/package.json ./services/supplier-service/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY services/supplier-service ./services/supplier-service

WORKDIR /app/services/supplier-service
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4005

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4005/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
