'use strict';

const { env } = require('@erp/shared');

module.exports = {
  serviceName: env.str('SERVICE_NAME', 'api-gateway'),
  version: env.str('SERVICE_VERSION', '1.0.0'),
  port: env.int('GATEWAY_PORT', 4000),
  nodeEnv: env.str('NODE_ENV', 'development'),
  apiVersion: env.str('API_VERSION', 'v1'),
  apiPrefix: `/api/${env.str('API_VERSION', 'v1')}`,
  publicUrl: env.str('GATEWAY_PUBLIC_URL', 'http://localhost:4000'),
  proxyTimeoutMs: env.int('PROXY_TIMEOUT_MS', 30000),
  bodyLimit: env.str('BODY_LIMIT', '5mb'),
  circuit: {
    failureThreshold: env.int('CIRCUIT_FAILURE_THRESHOLD', 5),
    resetMs: env.int('CIRCUIT_RESET_MS', 30000)
  },
  shutdownTimeoutMs: env.int('SHUTDOWN_TIMEOUT_MS', 10000)
};
