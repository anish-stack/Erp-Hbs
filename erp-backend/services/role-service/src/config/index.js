'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'role-service'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('ROLE_SERVICE_PORT', 4003),
  nodeEnv: env.str('NODE_ENV', 'development'),
  apiVersion: env.str('API_VERSION', 'v1'),
  basePath: `/api/${env.str('API_VERSION', 'v1')}`,
  bodyLimit: env.str('BODY_LIMIT', '1mb'),
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000),
  cache: {
    menuTtl: env.int('MENU_CACHE_TTL', 900),
    roleTtl: env.int('ROLE_CACHE_TTL', 900),
    permissionTtl: env.int('PERMISSION_CACHE_TTL', 900)
  }
};
