'use strict';

const path = require('path');
const { env } = require('@erp/shared');

const serviceRoot = path.resolve(__dirname, '../..');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'audit-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('AUDIT_SERVICE_PORT', 4019),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '256kb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 15000),

  retention: {
    days: env.int('AUDIT_RETENTION_DAYS', 730),
    rollupCron: env.str('AUDIT_ROLLUP_CRON', '15 1 * * *'),
    purgeCron: env.str('AUDIT_PURGE_CRON', '45 2 * * *')
  },

  statsCacheTtl: env.int('AUDIT_STATS_CACHE_TTL', 300),
  maxPayloadBytes: env.int('AUDIT_MAX_PAYLOAD_KB', 64) * 1024,

  export: {
    dir: path.resolve(serviceRoot, env.str('EXPORT_DIR', './storage/exports')),
    retentionHours: env.int('EXPORT_RETENTION_HOURS', 24),
    maxRows: env.int('AUDIT_EXPORT_MAX_ROWS', 100000)
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 2),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('AUDIT_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('AUDIT_QUEUE_BACKOFF_MS', 10000)
  }
};
