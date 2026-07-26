'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'sales-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('SALES_SERVICE_PORT', 4012),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('SALES_CACHE_TTL', 300),

  defaultWarehouseId: env.str('DEFAULT_WAREHOUSE_ID', '') || null,
  autoReserveOnConfirm: env.bool('AUTO_RESERVE_ON_CONFIRM', true),
  quotationValidDays: env.int('QUOTATION_VALID_DAYS', 15),

  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://127.0.0.1:4004'),
    crmServiceUrl: env.str('CRM_SERVICE_URL', 'http://127.0.0.1:4006'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', ''),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: { quotationExpiry: env.str('QUOTATION_EXPIRY_CRON', '0 1 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('SALES_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('SALES_QUEUE_BACKOFF_MS', 15000)
  }
};
