'use strict';

const { middlewares, constants } = require('@erp/shared');
const { PUBLIC_ROUTES } = require('../constants');
const config = require('../config');

const authenticate = middlewares.authenticate();

/**
 * Convert route pattern:
 * /sales/public/:id/accept
 *
 * into regex:
 * ^/sales/public/[^/]+/accept$
 */
function routeMatches(requestPath, routePath) {
  const pattern = routePath
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        return '[^/]+';
      }

      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return new RegExp(`^${pattern}$`).test(requestPath);
}

function isPublicRoute(req) {
  const path = req.originalUrl
    .split('?')[0]
    .replace(config.apiPrefix, '');

  return PUBLIC_ROUTES.some(
    (route) =>
      route.method === req.method &&
      routeMatches(path, route.path)
  );
}

/**
 * Gateway is the JWT boundary:
 * public routes pass through,
 * everything else requires a valid access token.
 */
module.exports = function gatewayAuth(req, res, next) {
  if (
    req.method === 'OPTIONS' ||
    isPublicRoute(req)
  ) {
    return next();
  }

  return authenticate(req, res, next);
};

module.exports.isPublicRoute = isPublicRoute;
module.exports.MESSAGES = constants.MESSAGES;