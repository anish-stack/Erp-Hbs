'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger, ApiError, constants } = require('@erp/shared');
const config = require('../config');
const { FORWARD_HEADERS } = require('../constants');
const { getBreaker } = require('../utils/circuitBreaker');

/**
 * Builds a proxy handler for one registry entry.
 * Identity is stripped from the client and re-injected from the verified JWT,
 * so downstream services can trust the forwarded headers.
 */
function createServiceProxy(service) {
  const breaker = getBreaker(service.key);

  const proxy = createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: config.proxyTimeoutMs,
    timeout: config.proxyTimeoutMs,
    logger: {
      info: () => {},
      warn: (msg) => logger.warn('[proxy:%s] %s', service.key, msg),
      error: (msg) => logger.error('[proxy:%s] %s', service.key, msg)
    },
    pathRewrite: (path) => {
      const [pathname, query] = path.split('?');
      const suffix = pathname === '/' ? '' : pathname.replace(/\/+$/, '');
      return `${config.apiPrefix}${service.prefix}${suffix}${query ? `?${query}` : ''}`;
    },
    on: {
      proxyReq(proxyReq, req) {
        for (const header of Object.values(FORWARD_HEADERS)) proxyReq.removeHeader(header);

        proxyReq.setHeader(FORWARD_HEADERS.REQUEST_ID, req.id);
        proxyReq.setHeader(FORWARD_HEADERS.GATEWAY, config.serviceName);

        if (req.user) {
          proxyReq.setHeader(FORWARD_HEADERS.USER_ID, req.user.id);
          proxyReq.setHeader(FORWARD_HEADERS.USER_EMAIL, req.user.email || '');
          proxyReq.setHeader(FORWARD_HEADERS.USER_ROLE, req.user.role || '');
          proxyReq.setHeader(FORWARD_HEADERS.USER_ROLE_ID, req.user.roleId || '');
          proxyReq.setHeader(FORWARD_HEADERS.USER_DEPARTMENT, req.user.departmentId || '');
          proxyReq.setHeader(FORWARD_HEADERS.TOKEN_ID, req.user.jti || '');
          proxyReq.setHeader(
            FORWARD_HEADERS.USER_PERMISSIONS,
            Buffer.from(JSON.stringify(req.user.permissions || [])).toString('base64')
          );
        }

        if (req.body && Object.keys(req.body).length && !service.multipart) {
          const payload = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(payload));
          proxyReq.write(payload);
          proxyReq.end();
        }
      },
      proxyRes(proxyRes, req) {
        if (proxyRes.statusCode >= 500) breaker.onFailure();
        else breaker.onSuccess();

        logger.info('Proxied request', {
          requestId: req.id,
          service: service.key,
          method: req.method,
          path: req.originalUrl,
          status: proxyRes.statusCode
        });
      },
      error(err, req, res) {
        breaker.onFailure();
        logger.error('Proxy error [%s]: %s', service.key, err.message, {
          requestId: req.id,
          path: req.originalUrl
        });

        if (res.headersSent) return res.end();

        const timedOut = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
        const statusCode = timedOut ? 504 : 503;

        return res.status(statusCode).json({
          success: false,
          code: timedOut ? 'GATEWAY_TIMEOUT' : 'SERVICE_UNAVAILABLE',
          message: `${service.name} ${timedOut ? 'timed out' : 'is unavailable'}`,
          requestId: req.id,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  return function guardedProxy(req, res, next) {
    if (!breaker.canRequest()) {
      return next(
        ApiError.serviceUnavailable(
          `${service.name} is temporarily unavailable`,
          { circuit: breaker.snapshot(), hint: constants.MESSAGES.COMMON.SERVICE_UNAVAILABLE }
        )
      );
    }
    return proxy(req, res, next);
  };
}

module.exports = { createServiceProxy };
