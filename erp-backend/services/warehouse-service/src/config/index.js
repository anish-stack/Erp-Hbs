'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'warehouse-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('WAREHOUSE_SERVICE_PORT', 4010),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('WAREHOUSE_CACHE_TTL', 600),

  autoPutawayTasks: env.bool('AUTO_PUTAWAY_TASKS', true),
  receivingZoneType: env.str('RECEIVING_ZONE_TYPE', 'RECEIVING'),

  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://127.0.0.1:4004'),
    inventoryServiceUrl: env.str('INVENTORY_SERVICE_URL', ''),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  crons: {
    binOccupancy: env.str('BIN_OCCUPANCY_CRON', '0 3 * * *'),
    staleTask: env.str('STALE_TASK_CRON', '0 * * * *')
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('WAREHOUSE_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('WAREHOUSE_QUEUE_BACKOFF_MS', 15000)
  }
};
