'use strict';

const ApiError = require('../http/ApiError');
const MESSAGES = require('../constants/messages');
const { SUPER_ADMIN_PERMISSION } = require('../constants/permissions');

function hasPermission(userPermissions = [], required) {
  if (userPermissions.includes(SUPER_ADMIN_PERMISSION)) return true;
  if (userPermissions.includes(required)) return true;
  const [module] = required.split('.');
  return userPermissions.includes(`${module}.*`);
}

/** Requires ALL listed permissions. */
function authorize(...permissions) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.user) return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
    const granted = permissions.every((perm) => hasPermission(req.user.permissions, perm));
    if (!granted) {
      return next(
        ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN, { required: permissions })
      );
    }
    return next();
  };
}

/** Requires ANY of the listed permissions. */
function authorizeAny(...permissions) {
  return function authorizeAnyMiddleware(req, res, next) {
    if (!req.user) return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
    const granted = permissions.some((perm) => hasPermission(req.user.permissions, perm));
    if (!granted) {
      return next(ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN, { requiredAny: permissions }));
    }
    return next();
  };
}

/** Restricts access to specific role codes. */
function authorizeRoles(...roles) {
  return function authorizeRolesMiddleware(req, res, next) {
    if (!req.user) return next(ApiError.unauthorized(MESSAGES.AUTH.UNAUTHORIZED));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(MESSAGES.AUTH.FORBIDDEN, { requiredRoles: roles }));
    }
    return next();
  };
}

module.exports = { authorize, authorizeAny, authorizeRoles, hasPermission };
