FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl tini openssl
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/crm-service/package.json ./services/crm-service/
RUN npm install --workspaces --include-workspace-root
COPY packages/shared ./packages/shared
COPY services/crm-service ./services/crm-service
WORKDIR /app/services/crm-service
RUN npx prisma generate
ENV NODE_ENV=production
EXPOSE 4006
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4006/health/live || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
