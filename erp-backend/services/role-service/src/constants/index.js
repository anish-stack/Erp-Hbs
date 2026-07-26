'use strict';

const MENU_TYPE = {
  SIDEBAR: 'SIDEBAR',
  HEADER: 'HEADER',
  DASHBOARD_WIDGET: 'DASHBOARD_WIDGET',
  QUICK_ACTION: 'QUICK_ACTION'
};

/** Roles that can never be deleted or have their code changed. */
const PROTECTED_ROLE_CODES = ['SUPER_ADMIN'];

const CACHE = {
  roleList: (hash) => `rbac:roles:list:${hash}`,
  role: (roleId) => `rbac:role:${roleId}`,
  rolePermissions: (roleId) => `rbac:role:${roleId}:permissions`,
  permissionMatrix: () => 'rbac:permissions:matrix',
  roleMenu: (roleId, type) => `rbac:menu:role:${roleId}:${type}`,
  navigation: (roleId) => `rbac:navigation:${roleId}`
};

const RBAC_CACHE_PATTERN = 'rbac:*';

module.exports = { MENU_TYPE, PROTECTED_ROLE_CODES, CACHE, RBAC_CACHE_PATTERN };
