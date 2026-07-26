'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'report-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('REPORT_SERVICE_PORT', 4017),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('REPORT_CACHE_TTL', 300),

  maxPagesPerReport: env.int('MAX_PAGES_PER_REPORT', 50),
  retentionDays: env.int('RETENTION_DAYS', 30),

  internal: {
    salesServiceUrl: env.str('SALES_SERVICE_URL', 'http://127.0.0.1:4012'),
    purchaseServiceUrl: env.str('PURCHASE_SERVICE_URL', 'http://127.0.0.1:4008'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', 'http://127.0.0.1:4009'),
    financeServiceUrl: env.str('FINANCE_SERVICE_URL', 'http://127.0.0.1:4013'),
    qualityServiceUrl: env.str('QUALITY_SERVICE_URL', 'http://127.0.0.1:4011'),
    fileServiceUrl: env.str('FILE_SERVICE_URL', 'http://127.0.0.1:4016'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 8000)
  },

  crons: { retentionScan: env.str('RETENTION_SCAN_CRON', '0 4 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('REPORT_QUEUE_ATTEMPTS', 2),
    backoffMs: env.int('REPORT_QUEUE_BACKOFF_MS', 20000)
  }
};
