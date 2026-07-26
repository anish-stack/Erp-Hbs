'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'supplier-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('SUPPLIER_SERVICE_PORT', 4005),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('SUPPLIER_CACHE_TTL', 600),

  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://master-service:4004'),
    fileServiceUrl: env.str('FILE_SERVICE_URL', 'http://file-service:4016'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },

  documents: {
    expiryWarnDays: env.int('DOCUMENT_EXPIRY_WARN_DAYS', 30),
    expiryCron: env.str('DOCUMENT_EXPIRY_CRON', '0 6 * * *')
  },

  rating: {
    recalcCron: env.str('RATING_RECALC_CRON', '30 2 * * 1'),
    weights: {
      onTimeDelivery: 0.3,
      quality: 0.3,
      price: 0.2,
      responsiveness: 0.1,
      compliance: 0.1
    }
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('SUPPLIER_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('SUPPLIER_QUEUE_BACKOFF_MS', 15000)
  }
};
