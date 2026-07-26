'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'master-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('MASTER_SERVICE_PORT', 4004),
  nodeEnv: env.str('NODE_ENV', 'development'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cacheTtl: env.int('MASTER_CACHE_TTL', 1800),
  partSearchLimit: env.int('PART_SEARCH_LIMIT', 25),
  baseCurrency: env.str('BASE_CURRENCY', 'INR')
};
