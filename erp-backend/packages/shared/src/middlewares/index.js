'use strict';

const security = require('./security');
const rateLimiter = require('./rateLimiter');
const authorize = require('./authorize');

module.exports = {
  requestContext: require('./requestContext'),
  requestLogger: require('./requestLogger'),
  authenticate: require('./authenticate'),
  authorize: authorize.authorize,
  authorizeAny: authorize.authorizeAny,
  authorizeRoles: authorize.authorizeRoles,
  hasPermission: authorize.hasPermission,
  validate: require('./validate'),
  notFound: require('./notFound'),
  errorHandler: require('./errorHandler'),
  applySecurity: security.applySecurity,
  corsMiddleware: security.corsMiddleware,
  helmetMiddleware: security.helmetMiddleware,
  xssSanitizer: security.xssSanitizer,
  createRateLimiter: rateLimiter.createRateLimiter,
  globalLimiter: rateLimiter.globalLimiter,
  authLimiter: rateLimiter.authLimiter
};
