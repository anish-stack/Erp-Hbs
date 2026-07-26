'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'quality-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('QUALITY_SERVICE_PORT', 4011),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('QUALITY_CACHE_TTL', 300),

  autoReceiptOnAccept: env.bool('AUTO_RECEIPT_ON_ACCEPT', true),

  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://127.0.0.1:4004'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', ''),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: { staleInspection: env.str('STALE_INSPECTION_CRON', '0 8 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('QUALITY_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('QUALITY_QUEUE_BACKOFF_MS', 15000)
  }
};
