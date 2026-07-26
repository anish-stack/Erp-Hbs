'use strict';

const jwtUtil = require('../utils/jwt');
const cache = require('../cache/redis');
const CACHE_KEYS = require('../constants/cacheKeys');
const ApiError = require('../http/ApiError');
const MESSAGES = require('../constants/messages');

/**
 * Verifies the access token, rejects blacklisted sessions and populates req.user.
 * @param {object} options { optional: boolean }
 */
function authenticate(options = {}) {
  return async function authenticateMiddleware(req, res, next) {
    try {
      const token = jwtUtil.extractBearer(req);

      if (!token) {
        if (options.optional) return next();
        throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_MISSING);
      }

      const decoded = jwtUtil.verifyAccessToken(token);

      if (cache.isConnected()) {
        const blacklisted = await cache.exists(CACHE_KEYS.tokenBlacklist(decoded.jti));
        if (blacklisted) throw ApiError.unauthorized(MESSAGES.AUTH.TOKEN_REVOKED);
      }

      req.user = {
        id: decoded.sub,
        email: decoded.email,
        employeeCode: decoded.employeeCode || null,
        roleId: decoded.roleId,
        role: decoded.role,
        departmentId: decoded.departmentId || null,
        permissions: decoded.permissions || [],
        jti: decoded.jti
      };
      req.token = token;

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = authenticate;
