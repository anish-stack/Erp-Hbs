'use strict';

const os = require('os');
const express = require('express');
const env = require('../config/env');
const cache = require('../cache/redis');
const broker = require('../events/rabbitmq');

/**
 * Standard health endpoints for every service.
 * @param {object} options { serviceName, version, checks: { db: async () => boolean } }
 */
module.exports = function healthRouter(options = {}) {
  const router = express.Router();
  const serviceName = options.serviceName || env.str('SERVICE_NAME', 'erp-service');
  const version = options.version || env.str('SERVICE_VERSION', '1.0.0');
  const customChecks = options.checks || {};

  router.get('/health', async (req, res) => {
    const checks = {};

    if (typeof customChecks.database === 'function') {
      checks.database = (await customChecks.database().catch(() => false)) ? 'up' : 'down';
    }
    if (options.redis !== false) {
      checks.redis = (await cache.ping().catch(() => false)) ? 'up' : 'down';
    }
    if (options.rabbitmq !== false) {
      checks.rabbitmq = broker.isConnected() ? 'up' : 'down';
    }

    for (const [name, fn] of Object.entries(customChecks)) {
      if (name === 'database') continue;
      checks[name] = (await fn().catch(() => false)) ? 'up' : 'down';
    }

    const healthy = Object.values(checks).every((state) => state === 'up');

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      service: serviceName,
      version,
      status: healthy ? 'healthy' : 'degraded',
      environment: env.str('NODE_ENV', 'development'),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssMb: Number((process.memoryUsage().rss / 1048576).toFixed(2)),
        heapUsedMb: Number((process.memoryUsage().heapUsed / 1048576).toFixed(2)),
        systemFreeMb: Number((os.freemem() / 1048576).toFixed(2))
      },
      checks,
      timestamp: new Date().toISOString()
    });
  });

  router.get('/health/live', (req, res) => {
    res.status(200).json({ success: true, service: serviceName, status: 'alive' });
  });

  router.get('/health/ready', async (req, res) => {
    const dbReady = typeof customChecks.database === 'function'
      ? await customChecks.database().catch(() => false)
      : true;
    const ready = dbReady && (options.redis === false || (await cache.ping().catch(() => false)));
    res.status(ready ? 200 : 503).json({
      success: ready,
      service: serviceName,
      status: ready ? 'ready' : 'not-ready'
    });
  });

  return router;
};
