'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'inventory-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('INVENTORY_SERVICE_PORT', 4009),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('INVENTORY_CACHE_TTL', 300),

  defaultWarehouseId: env.str('DEFAULT_WAREHOUSE_ID', '') || null,
  valuationMethod: env.str('VALUATION_METHOD', 'MOVING_AVERAGE'),
  reservationTtlHours: env.int('RESERVATION_TTL_HOURS', 72),

  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://127.0.0.1:4004'),
    warehouseServiceUrl: env.str('WAREHOUSE_SERVICE_URL', ''),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: {
    lowStock: env.str('LOW_STOCK_SCAN_CRON', '0 7 * * *'),
    reservationSweep: env.str('RESERVATION_SWEEP_CRON', '*/15 * * * *'),
    lotExpiry: env.str('LOT_EXPIRY_SCAN_CRON', '15 7 * * *')
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('INVENTORY_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('INVENTORY_QUEUE_BACKOFF_MS', 15000)
  }
};
