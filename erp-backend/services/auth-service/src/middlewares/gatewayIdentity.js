'use strict';

const { middlewares, ApiError } = require('@erp/shared');

const verifyToken = middlewares.authenticate();

/**
 * Downstream services trust the gateway's verified identity headers.
 * If they are absent (direct call in dev / internal test), fall back to JWT verification.
 */
module.exports = function gatewayIdentity(req, res, next) {
  const userId = req.headers['x-user-id'];

  if (!userId) return verifyToken(req, res, next);

  let permissions = [];
  try {
    const encoded = req.headers['x-user-permissions'];
    if (encoded) permissions = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (err) {
    return next(ApiError.unauthorized('Malformed identity headers'));
  }

  req.user = {
    id: userId,
    email: req.headers['x-user-email'] || null,
    role: req.headers['x-user-role'] || null,
    roleId: req.headers['x-user-role-id'] || null,
    departmentId: req.headers['x-user-department-id'] || null,
    jti: req.headers['x-token-id'] || null,
    permissions
  };

  return next();
};
