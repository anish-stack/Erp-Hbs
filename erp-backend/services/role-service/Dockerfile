FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl tini openssl

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/role-service/package.json ./services/role-service/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY services/role-service ./services/role-service

WORKDIR /app/services/role-service
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4003/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
