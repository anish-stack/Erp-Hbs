'use strict';

const permissionsModule = require('./permissions');

module.exports = {
  ROLES: require('./roles'),
  // Flat permission-code map: PERMISSIONS.user.CREATE === 'user.create'
  PERMISSIONS: permissionsModule.PERMISSIONS,
  // Raw module: { ACTIONS, MODULES, PERMISSIONS, ALL_PERMISSIONS, SUPER_ADMIN_PERMISSION }
  PERMISSION_META: permissionsModule,
  MESSAGES: require('./messages'),
  CACHE_KEYS: require('./cacheKeys'),
  DEMO: require('./demoData')
};
