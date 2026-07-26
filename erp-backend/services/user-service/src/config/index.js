'use strict';

const path = require('path');
const { env } = require('@erp/shared');

const serviceRoot = path.resolve(__dirname, '../..');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'user-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('USER_SERVICE_PORT', 4002),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),

  cache: {
    userTtl: env.int('USER_CACHE_TTL', 300)
  },

  bulk: {
    exportDir: path.resolve(serviceRoot, env.str('EXPORT_DIR', './storage/exports')),
    importDir: path.resolve(serviceRoot, env.str('IMPORT_DIR', './storage/imports')),
    retentionHours: env.int('EXPORT_RETENTION_HOURS', 24),
    maxImportRows: env.int('IMPORT_MAX_ROWS', 5000),
    maxImportFileMb: env.int('IMPORT_MAX_FILE_MB', 10)
  },

  queue: {
    prefix: env.str('QUEUE_PREFIX', 'erp'),
    concurrency: env.int('QUEUE_CONCURRENCY', 3),
    runInline: env.bool('RUN_WORKERS_INLINE', true),
    attempts: env.int('BULK_QUEUE_ATTEMPTS', 3),
    backoffMs: env.int('BULK_QUEUE_BACKOFF_MS', 10000)
  }
};
