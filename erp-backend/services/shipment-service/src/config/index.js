'use strict';
const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'shipment-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('SHIPMENT_SERVICE_PORT', 4014),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('SHIPMENT_CACHE_TTL', 300),

  autoCreateOnOrderConfirm: env.bool('AUTO_CREATE_ON_ORDER_CONFIRM', true),
  autoCreatePickTasks: env.bool('AUTO_CREATE_PICK_TASKS', true),
  defaultCarrier: env.str('DEFAULT_CARRIER', 'Self'),

  internal: {
    salesServiceUrl: env.str('SALES_SERVICE_URL', 'http://127.0.0.1:4012'),
    warehouseServiceUrl: env.str('WAREHOUSE_SERVICE_URL', 'http://127.0.0.1:4010'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', ''),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: { staleShipment: env.str('STALE_SHIPMENT_CRON', '0 9 * * *') },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('SHIPMENT_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('SHIPMENT_QUEUE_BACKOFF_MS', 15000)
  }
};
