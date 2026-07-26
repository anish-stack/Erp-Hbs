FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl tini

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/api-gateway/package.json ./services/api-gateway/

RUN npm install --omit=dev --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY services/api-gateway ./services/api-gateway

ENV NODE_ENV=production
WORKDIR /app/services/api-gateway
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:4000/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
