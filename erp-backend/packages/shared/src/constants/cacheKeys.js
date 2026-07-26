'use strict';

module.exports = {
  tokenBlacklist: (jti) => `auth:blacklist:${jti}`,
  refreshToken: (userId, jti) => `auth:refresh:${userId}:${jti}`,
  otp: (identifier) => `auth:otp:${identifier}`,
  loginAttempts: (identifier) => `auth:attempts:${identifier}`,
  userSession: (userId) => `auth:session:${userId}`,
  userPermissions: (userId) => `rbac:permissions:${userId}`,
  rolePermissions: (roleId) => `rbac:role:${roleId}`,
  userMenu: (userId) => `rbac:menu:${userId}`,
  masterData: (entity) => `master:${entity}`,
  dashboard: (roleId, widget) => `dashboard:${roleId}:${widget}`,
  inventoryStock: (partId, warehouseId) => `inventory:stock:${partId}:${warehouseId}`,
  patterns: {
    userScoped: (userId) => `*:${userId}*`,
    rbac: () => 'rbac:*',
    dashboard: () => 'dashboard:*',
    master: () => 'master:*'
  }
};
