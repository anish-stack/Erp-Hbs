'use strict';

const { env } = require('@erp/shared');

/** BullMQ needs its own ioredis options object (maxRetriesPerRequest must be null). */
function bullConnection() {
  return {
    host: env.str('REDIS_HOST', '127.0.0.1'),
    port: env.int('REDIS_PORT', 6379),
    password: env.str('REDIS_PASSWORD', '') || undefined,
    db: env.int('REDIS_DB', 0),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };
}

module.exports = { bullConnection };
