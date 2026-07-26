FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl tini openssl vips-dev

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/file-service/package.json ./services/file-service/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared ./packages/shared
COPY services/file-service ./services/file-service

WORKDIR /app/services/file-service
RUN npx prisma generate && mkdir -p storage/files storage/tmp

ENV NODE_ENV=production
EXPOSE 4016

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4016/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
