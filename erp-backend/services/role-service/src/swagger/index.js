'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const rolePaths = require('./role.swagger');
const menuPaths = require('./menu.swagger');

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Role, Permission & Menu Service',
    description:
      'Dynamic RBAC: roles, permission matrix, and per-role sidebars, headers, dashboard widgets and route guards.',
    version: config.version,
    tags: [
      { name: 'Roles', description: 'Role lifecycle and permission assignment' },
      { name: 'Permissions', description: 'Permission catalogue and matrix' },
      { name: 'Menus', description: 'Menu tree administration' },
      { name: 'Navigation', description: 'Role-driven navigation for the frontend' }
    ],
    paths: { ...rolePaths.paths, ...menuPaths.paths },
    components: { schemas: { ...rolePaths.schemas, ...menuPaths.schemas } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
