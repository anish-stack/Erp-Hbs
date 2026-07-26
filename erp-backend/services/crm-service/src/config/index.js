'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'crm-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('CRM_SERVICE_PORT', 4006),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('CRM_CACHE_TTL', 600),
  lead: { staleDays: env.int('LEAD_STALE_DAYS', 14), followUpCron: env.str('FOLLOWUP_SCAN_CRON', '0 8 * * *') },
  internal: {
    masterServiceUrl: env.str('MASTER_SERVICE_URL', 'http://master-service:4004'),
    timeoutMs: env.int('INTERNAL_TIMEOUT_MS', 5000)
  },
  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('CRM_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('CRM_QUEUE_BACKOFF_MS', 15000)
  }
};
