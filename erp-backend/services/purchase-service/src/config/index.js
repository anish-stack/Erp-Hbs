'use strict';
const { env } = require('@erp/shared');
module.exports = {
  serviceName: env.str('SERVICE_NAME', 'purchase-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('PURCHASE_SERVICE_PORT', 4008),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('PURCHASE_CACHE_TTL', 300),
  approvalThreshold: env.int('PO_APPROVAL_THRESHOLD', 100000),
  grnTolerancePercent: env.int('GRN_TOLERANCE_PERCENT', 5),
  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://master-service:4004'),
    supplierServiceUrl: env.str('SUPPLIER_SERVICE_URL', 'http://supplier-service:4005'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },
  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('PURCHASE_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('PURCHASE_QUEUE_BACKOFF_MS', 15000)
  }
};
