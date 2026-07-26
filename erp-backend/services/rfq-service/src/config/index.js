'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'rfq-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('RFQ_SERVICE_PORT', 4007),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('RFQ_CACHE_TTL', 300),
  defaultValidityDays: env.int('RFQ_DEFAULT_VALIDITY_DAYS', 15),
  deadlineScanCron: env.str('RFQ_DEADLINE_SCAN_CRON', '0 9 * * *'),
  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://master-service:4004'),
    supplierServiceUrl: env.str('SUPPLIER_SERVICE_URL', 'http://supplier-service:4005'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },
  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('RFQ_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('RFQ_QUEUE_BACKOFF_MS', 15000)
  }
};
