'use strict';

const config = require('../config');

const base = `${config.basePath}/roles`;
const permissionBase = `${config.basePath}/permissions`;

const roleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'SALES_MANAGER' },
    name: { type: 'string', example: 'Sales Manager' },
    description: { type: 'string', nullable: true },
    isSystem: { type: 'boolean' },
    isActive: { type: 'boolean' },
    landingPath: { type: 'string', example: '/dashboard/sales' },
    userCount: { type: 'integer' },
    permissionCount: { type: 'integer' },
    permissions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string', example: 'sales.approve' },
          module: { type: 'string' },
          action: { type: 'string' }
        }
      }
    }
  }
};

const permissionSelection = {
  type: 'object',
  properties: {
    permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    permissionCodes: { type: 'array', items: { type: 'string', example: 'sales.view' } }
  }
};

const idParam = [
  { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }
];

const paths = {
  [base]: {
    get: {
      tags: ['Roles'],
      summary: 'List roles (paginated, searchable, filterable)',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { $ref: '#/components/parameters/sortBy' },
        { $ref: '#/components/parameters/sortOrder' },
        { in: 'query', name: 'isActive', schema: { type: 'boolean' } },
        { in: 'query', name: 'isSystem', schema: { type: 'boolean' } }
      ],
      responses: {
        200: {
          description: 'Roles fetched',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } }
          }
        },
        403: { $ref: '#/components/responses/Forbidden' }
      }
    },
    post: {
      tags: ['Roles'],
      summary: 'Create a role (optionally with its permission set)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'name'],
              properties: {
                code: { type: 'string', example: 'REGIONAL_SALES_HEAD' },
                name: { type: 'string' },
                description: { type: 'string' },
                landingPath: { type: 'string', example: '/dashboard/sales' },
                isActive: { type: 'boolean', default: true },
                permissionCodes: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'Role created', content: { 'application/json': { schema: roleSchema } } },
        409: { description: 'Role code already exists' },
        422: { $ref: '#/components/responses/ValidationError' }
      }
    }
  },

  [`${base}/{id}`]: {
    get: {
      tags: ['Roles'],
      summary: 'Get a role with its permissions',
      parameters: idParam,
      responses: {
        200: { description: 'Role fetched', content: { 'application/json': { schema: roleSchema } } },
        404: { $ref: '#/components/responses/NotFound' }
      }
    },
    put: {
      tags: ['Roles'],
      summary: 'Update a role',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                landingPath: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: { description: 'Role updated' },
        403: { description: 'System role is protected' },
        404: { $ref: '#/components/responses/NotFound' }
      }
    },
    delete: {
      tags: ['Roles'],
      summary: 'Soft delete a role (blocked while users are assigned)',
      parameters: idParam,
      responses: {
        200: { description: 'Role deleted' },
        403: { description: 'System role cannot be deleted' },
        409: { description: 'Role still assigned to users' }
      }
    }
  },

  [`${base}/{id}/clone`]: {
    post: {
      tags: ['Roles'],
      summary: 'Clone a role with its full permission set',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'name'],
              properties: {
                code: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                landingPath: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Role cloned' }, 409: { description: 'Code already exists' } }
    }
  },

  [`${base}/{id}/permissions`]: {
    get: {
      tags: ['Roles'],
      summary: 'Permission codes of a role (Redis cached)',
      parameters: idParam,
      responses: { 200: { description: 'Permissions fetched' } }
    },
    put: {
      tags: ['Roles'],
      summary: 'Replace the entire permission set of a role',
      description: 'Invalidates the shared RBAC cache and publishes role.permissions_changed.',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: permissionSelection } } },
      responses: {
        200: { description: 'Permissions updated' },
        400: { description: 'Unknown permission supplied' },
        403: { description: 'Super Admin permissions are immutable' }
      }
    },
    post: {
      tags: ['Roles'],
      summary: 'Grant additional permissions to a role',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: permissionSelection } } },
      responses: { 200: { description: 'Permissions granted' } }
    },
    delete: {
      tags: ['Roles'],
      summary: 'Revoke permissions from a role',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: permissionSelection } } },
      responses: { 200: { description: 'Permissions revoked' } }
    }
  },

  [permissionBase]: {
    get: {
      tags: ['Permissions'],
      summary: 'List permissions (paginated)',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'module', schema: { type: 'string', example: 'purchase' } },
        { in: 'query', name: 'action', schema: { type: 'string', example: 'approve' } }
      ],
      responses: { 200: { description: 'Permissions fetched' } }
    }
  },

  [`${permissionBase}/matrix`]: {
    get: {
      tags: ['Permissions'],
      summary: 'Module-grouped permission matrix for the admin UI',
      responses: { 200: { description: 'Matrix fetched' } }
    }
  },

  [`${permissionBase}/modules`]: {
    get: {
      tags: ['Permissions'],
      summary: 'Distinct permission modules',
      responses: { 200: { description: 'Modules fetched' } }
    }
  },

  [`${permissionBase}/sync`]: {
    post: {
      tags: ['Permissions'],
      summary: 'Regenerate the permission catalogue from platform constants',
      responses: { 200: { description: 'Catalogue synchronised' } }
    }
  }
};

module.exports = { paths, schemas: { Role: roleSchema } };
