'use strict';

const logger = require('../logger');

const SENSITIVE_PATHS = ['/auth/login', '/auth/register', '/auth/reset-password'];

module.exports = function requestLogger(req, res, next) {
  res.on('finish', () => {
    const durationMs = req.startTime
      ? Number(process.hrtime.bigint() - req.startTime) / 1e6
      : 0;

    const meta = {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userId: req.user ? req.user.id : null,
      userAgent: req.headers['user-agent']
    };

    if (!SENSITIVE_PATHS.some((p) => req.originalUrl.includes(p)) && req.method !== 'GET') {
      meta.bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    }

    if (res.statusCode >= 500) logger.error('HTTP request failed', meta);
    else if (res.statusCode >= 400) logger.warn('HTTP request rejected', meta);
    else logger.info('HTTP request', meta);
  });

  next();
};
