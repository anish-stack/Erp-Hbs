'use strict';

const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const env = require('../config/env');
const ApiError = require('../http/ApiError');
const { cleanObject } = require('../utils/sanitize');

function corsMiddleware() {
  const origins = env.list('CORS_ORIGINS', []);
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!origins.length || origins.includes('*') || origins.includes(origin)) {
        return callback(null, true);
      }
      return callback(ApiError.forbidden(`Origin not allowed: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Refresh-Token'],
    exposedHeaders: ['X-Request-Id', 'X-Total-Count'],
    maxAge: 86400
  });
}

function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: env.isProd() ? undefined : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  });
}

function xssSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = cleanObject(req.body);
  if (req.query && typeof req.query === 'object') {
    const cleaned = cleanObject(req.query);
    for (const key of Object.keys(cleaned)) req.query[key] = cleaned[key];
  }
  if (req.params && typeof req.params === 'object') req.params = cleanObject(req.params);
  next();
}

/** Applies the standard security stack to an Express app. */
function applySecurity(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', env.int('TRUST_PROXY_HOPS', 1));
  app.use(helmetMiddleware());
  app.use(corsMiddleware());
  app.use(compression());
  return app;
}

module.exports = { applySecurity, corsMiddleware, helmetMiddleware, xssSanitizer };
