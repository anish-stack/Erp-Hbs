'use strict';

const config = require('../config');

const base = `${config.basePath}/menus`;

const menuSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'purchase.orders' },
    label: { type: 'string', example: 'Purchase Orders' },
    icon: { type: 'string', nullable: true, example: 'shopping-cart' },
    path: { type: 'string', nullable: true, example: '/purchase/orders' },
    type: { type: 'string', enum: ['SIDEBAR', 'HEADER', 'DASHBOARD_WIDGET', 'QUICK_ACTION'] },
    module: { type: 'string', nullable: true },
    permissionCode: { type: 'string', nullable: true, example: 'purchase.view' },
    badgeKey: { type: 'string', nullable: true, example: 'purchase.pendingApprovals' },
    parentId: { type: 'string', nullable: true },
    sortOrder: { type: 'integer' },
    isActive: { type: 'boolean' }
  }
};

const navigationSchema = {
  type: 'object',
  properties: {
    role: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string' },
        name: { type: 'string' },
        landingPath: { type: 'string' }
      }
    },
    landingPath: { type: 'string', example: '/dashboard/purchase' },
    sidebar: { type: 'array', items: menuSchema },
    header: { type: 'array', items: menuSchema },
    dashboardWidgets: { type: 'array', items: menuSchema },
    quickActions: { type: 'array', items: menuSchema },
    allowedPaths: { type: 'array', items: { type: 'string' } }
  }
};

const idParam = [
  { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }
];
const roleParam = [
  { in: 'path', name: 'roleId', required: true, schema: { type: 'string', format: 'uuid' } }
];

const paths = {
  [`${base}/me`]: {
    get: {
      tags: ['Navigation'],
      summary: 'Navigation for the signed-in user',
      description:
        'Sidebar, header, dashboard widgets, quick actions and allowed route paths, filtered by the user permissions. Cached in Redis per role.',
      responses: {
        200: { description: 'Navigation fetched', content: { 'application/json': { schema: navigationSchema } } },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/role/{roleId}`]: {
    get: {
      tags: ['Navigation'],
      summary: 'Preview the navigation of any role',
      parameters: roleParam,
      responses: { 200: { description: 'Role navigation fetched' }, 404: { $ref: '#/components/responses/NotFound' } }
    }
  },

  [`${base}/role/{roleId}/assignments`]: {
    get: {
      tags: ['Navigation'],
      summary: 'Explicit menu assignments of a role',
      parameters: roleParam,
      responses: { 200: { description: 'Assignments fetched' } }
    },
    put: {
      tags: ['Navigation'],
      summary: 'Pin an explicit menu set to a role',
      description: 'An empty list restores permission-driven defaults.',
      parameters: roleParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      menuId: { type: 'string', format: 'uuid' },
                      sortOrder: { type: 'integer', nullable: true },
                      isVisible: { type: 'boolean', default: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Role menus updated' } }
    }
  },

  [base]: {
    get: {
      tags: ['Menus'],
      summary: 'List every menu (flat and tree)',
      parameters: [
        {
          in: 'query',
          name: 'type',
          schema: { type: 'string', enum: ['SIDEBAR', 'HEADER', 'DASHBOARD_WIDGET', 'QUICK_ACTION'] }
        }
      ],
      responses: { 200: { description: 'Menus fetched' } }
    },
    post: {
      tags: ['Menus'],
      summary: 'Create a menu item',
      requestBody: { required: true, content: { 'application/json': { schema: menuSchema } } },
      responses: { 201: { description: 'Menu created' }, 409: { description: 'Menu code exists' } }
    }
  },

  [`${base}/reorder`]: {
    put: {
      tags: ['Menus'],
      summary: 'Bulk reorder and re-parent menus (drag and drop)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      sortOrder: { type: 'integer' },
                      parentId: { type: 'string', format: 'uuid', nullable: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Menus reordered' } }
    }
  },

  [`${base}/{id}`]: {
    get: {
      tags: ['Menus'],
      summary: 'Get one menu',
      parameters: idParam,
      responses: { 200: { description: 'Menu fetched' }, 404: { $ref: '#/components/responses/NotFound' } }
    },
    put: {
      tags: ['Menus'],
      summary: 'Update a menu',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: menuSchema } } },
      responses: { 200: { description: 'Menu updated' } }
    },
    delete: {
      tags: ['Menus'],
      summary: 'Soft delete a menu and its children',
      parameters: idParam,
      responses: { 200: { description: 'Menu deleted' } }
    }
  }
};

module.exports = { paths, schemas: { Menu: menuSchema, Navigation: navigationSchema } };
