'use strict';

const express = require('express');
const { ApiResponse, asyncHandler, cache, middlewares } = require('@erp/shared');
const config = require('../config');
const { getRegistry, getUpstreams } = require('../config/services');
const { snapshotAll } = require('../utils/circuitBreaker');

const router = express.Router();

router.get(
  '/services',
  middlewares.authenticate(),
  asyncHandler(async (req, res) => {
    const circuits = snapshotAll();
    const services = getRegistry().map((service) => ({
      key: service.key,
      name: service.name,
      route: `${config.apiPrefix}${service.prefix}`,
      upstream: service.url,
      circuit: circuits.find((c) => c.upstream === service.key) || {
        state: 'CLOSED',
        failures: 0
      }
    }));
    return ApiResponse.ok(res, services, 'Service registry fetched');
  })
);

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const upstreams = getUpstreams();

    const results = await Promise.all(
      upstreams.map(async (service) => {
        const started = Date.now();
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(`${service.url}/health/live`, {
            signal: controller.signal
          });
          clearTimeout(timer);
          return {
            service: service.name,
            key: service.key,
            status: response.ok ? 'up' : 'down',
            latencyMs: Date.now() - started
          };
        } catch (err) {
          return {
            service: service.name,
            key: service.key,
            status: 'down',
            latencyMs: Date.now() - started,
            error: err.name === 'AbortError' ? 'timeout' : err.message
          };
        }
      })
    );

    const healthy = results.every((r) => r.status === 'up');

    return ApiResponse.send(res, {
      statusCode: healthy ? 200 : 503,
      message: healthy ? 'All services operational' : 'One or more services are down',
      data: {
        gateway: 'up',
        redis: (await cache.ping().catch(() => false)) ? 'up' : 'down',
        services: results
      }
    });
  })
);

module.exports = router;
