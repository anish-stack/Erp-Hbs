'use strict';

const config = require('../config');

const base = `${config.basePath}/users`;
const deptBase = `${config.basePath}/departments`;

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    employeeCode: { type: 'string', example: 'EMP1042' },
    firstName: { type: 'string' },
    lastName: { type: 'string', nullable: true },
    fullName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    mobile: { type: 'string', nullable: true },
    designation: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
    dateOfJoining: { type: 'string', format: 'date', nullable: true },
    role: {
      type: 'object',
      properties: { id: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' } }
    },
    department: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' } }
    },
    reportsTo: {
      type: 'object',
      nullable: true,
      properties: { id: { type: 'string' }, fullName: { type: 'string' }, email: { type: 'string' } }
    },
    directReportCount: { type: 'integer' },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true }
  }
};

const bulkJobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    type: { type: 'string', enum: ['EXPORT', 'IMPORT'] },
    status: { type: 'string', enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'] },
    totalRows: { type: 'integer' },
    processedRows: { type: 'integer' },
    successRows: { type: 'integer' },
    failedRows: { type: 'integer' },
    progressPercent: { type: 'integer', example: 64 },
    downloadUrl: { type: 'string', nullable: true },
    errorReport: {
      type: 'array',
      nullable: true,
      items: {
        type: 'object',
        properties: {
          row: { type: 'integer', example: 14 },
          email: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const bulkParam = [
  { in: 'path', name: 'bulkJobId', required: true, schema: { type: 'string', format: 'uuid' } }
];

const paths = {
  [`${base}/me`]: {
    get: {
      tags: ['Profile'],
      summary: 'Current user profile',
      responses: { 200: { description: 'Profile fetched', content: { 'application/json': { schema: userSchema } } } }
    },
    put: {
      tags: ['Profile'],
      summary: 'Update own profile (safe field subset)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                mobile: { type: 'string' },
                avatarUrl: { type: 'string' },
                timezone: { type: 'string', example: 'Asia/Kolkata' },
                locale: { type: 'string', example: 'en-IN' },
                dateOfBirth: { type: 'string', format: 'date' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Profile updated' }, 409: { description: 'Mobile already in use' } }
    }
  },

  [base]: {
    get: {
      tags: ['Users'],
      summary: 'List users',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { $ref: '#/components/parameters/sortBy' },
        { $ref: '#/components/parameters/sortOrder' },
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] } },
        { in: 'query', name: 'roleId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'departmentId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' } }
      ],
      responses: {
        200: { description: 'Users fetched', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } }
      }
    },
    post: {
      tags: ['Users'],
      summary: 'Create a user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['employeeCode', 'firstName', 'email', 'password', 'roleId'],
              properties: {
                employeeCode: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                email: { type: 'string', format: 'email' },
                mobile: { type: 'string' },
                designation: { type: 'string' },
                password: { type: 'string', format: 'password' },
                roleId: { type: 'string', format: 'uuid' },
                departmentId: { type: 'string', format: 'uuid' },
                reportsToId: { type: 'string', format: 'uuid' },
                dateOfJoining: { type: 'string', format: 'date' },
                mustChangePassword: { type: 'boolean', default: true }
              }
            }
          }
        }
      },
      responses: {
        201: { description: 'User created' },
        409: { description: 'Email, mobile or employee code already exists' }
      }
    }
  },

  [`${base}/stats`]: {
    get: {
      tags: ['Users'],
      summary: 'Headcount statistics by status, role and department',
      responses: { 200: { description: 'Statistics fetched' } }
    }
  },

  [`${base}/{id}`]: {
    get: {
      tags: ['Users'],
      summary: 'Get one user',
      parameters: idParam,
      responses: { 200: { description: 'User fetched' }, 404: { $ref: '#/components/responses/NotFound' } }
    },
    put: {
      tags: ['Users'],
      summary: 'Update a user',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: userSchema } } },
      responses: { 200: { description: 'User updated' }, 409: { description: 'Duplicate identifier' } }
    },
    delete: {
      tags: ['Users'],
      summary: 'Soft delete a user',
      parameters: idParam,
      responses: {
        200: { description: 'User deleted' },
        409: { description: 'User still has direct reports' }
      }
    }
  },

  [`${base}/{id}/reports`]: {
    get: {
      tags: ['Users'],
      summary: 'Direct reports of a user',
      parameters: idParam,
      responses: { 200: { description: 'Direct reports fetched' } }
    }
  },

  [`${base}/{id}/status`]: {
    patch: {
      tags: ['Users'],
      summary: 'Activate, deactivate or suspend a user',
      description: 'Publishes user.status_changed - the Auth Service revokes live sessions on suspend or deactivate.',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                reason: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Status updated' }, 400: { description: 'Cannot deactivate own account' } }
    }
  },

  [`${base}/{id}/role`]: {
    patch: {
      tags: ['Users'],
      summary: 'Change a user role (invalidates the RBAC cache)',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['roleId'], properties: { roleId: { type: 'string', format: 'uuid' } } }
          }
        }
      },
      responses: { 200: { description: 'Role updated' }, 400: { description: 'Cannot change own role' } }
    }
  },

  [`${base}/{id}/reset-password`]: {
    post: {
      tags: ['Users'],
      summary: 'Admin password reset (forces change at next sign-in)',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object', required: ['newPassword'], properties: { newPassword: { type: 'string', format: 'password' } } }
          }
        }
      },
      responses: { 200: { description: 'Password reset' } }
    }
  },

  [`${base}/{id}/unlock`]: {
    post: {
      tags: ['Users'],
      summary: 'Clear failed login attempts and unlock an account',
      parameters: idParam,
      responses: { 200: { description: 'Account unlocked' } }
    }
  },

  [`${base}/export`]: {
    post: {
      tags: ['Bulk'],
      summary: 'Queue an Excel export of users',
      description: 'Returns immediately with a bulkJobId; the BullMQ worker streams the workbook to disk.',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
                roleId: { type: 'string', format: 'uuid' },
                departmentId: { type: 'string', format: 'uuid' },
                search: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 202: { description: 'Export queued' } }
    }
  },

  [`${base}/import`]: {
    post: {
      tags: ['Bulk'],
      summary: 'Queue an Excel import of users',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary', description: '.xlsx built from the template' },
                defaultPassword: { type: 'string', format: 'password' }
              }
            }
          }
        }
      },
      responses: { 202: { description: 'Import queued' }, 400: { description: 'Invalid file' } }
    }
  },

  [`${base}/import/template`]: {
    get: {
      tags: ['Bulk'],
      summary: 'Download the import template with valid role and department codes',
      responses: { 200: { description: 'XLSX template' } }
    }
  },

  [`${base}/bulk`]: {
    get: {
      tags: ['Bulk'],
      summary: 'List bulk jobs (own jobs unless user.export is granted)',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { in: 'query', name: 'type', schema: { type: 'string', enum: ['EXPORT', 'IMPORT'] } },
        { in: 'query', name: 'status', schema: { type: 'string', enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL'] } }
      ],
      responses: { 200: { description: 'Bulk jobs fetched' } }
    }
  },

  [`${base}/bulk/{bulkJobId}`]: {
    get: {
      tags: ['Bulk'],
      summary: 'Bulk job progress and per-row error report',
      parameters: bulkParam,
      responses: {
        200: { description: 'Status fetched', content: { 'application/json': { schema: bulkJobSchema } } },
        404: { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  [`${base}/bulk/{bulkJobId}/download`]: {
    get: {
      tags: ['Bulk'],
      summary: 'Download a completed export',
      parameters: bulkParam,
      responses: {
        200: { description: 'XLSX file' },
        404: { description: 'File expired or removed' }
      }
    }
  },

  [deptBase]: {
    get: {
      tags: ['Departments'],
      summary: 'List departments',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'isActive', schema: { type: 'boolean' } }
      ],
      responses: { 200: { description: 'Departments fetched' } }
    },
    post: {
      tags: ['Departments'],
      summary: 'Create a department',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['code', 'name'],
              properties: {
                code: { type: 'string', example: 'PURCHASE' },
                name: { type: 'string' },
                description: { type: 'string' },
                headUserId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Department created' }, 409: { description: 'Code exists' } }
    }
  },

  [`${deptBase}/options`]: {
    get: {
      tags: ['Departments'],
      summary: 'Active departments for dropdowns',
      responses: { 200: { description: 'Options fetched' } }
    }
  },

  [`${deptBase}/{id}`]: {
    get: {
      tags: ['Departments'],
      summary: 'Get a department',
      parameters: idParam,
      responses: { 200: { description: 'Department fetched' } }
    },
    put: {
      tags: ['Departments'],
      summary: 'Update a department',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
      responses: { 200: { description: 'Department updated' } }
    },
    delete: {
      tags: ['Departments'],
      summary: 'Soft delete a department',
      parameters: idParam,
      responses: { 200: { description: 'Deleted' }, 409: { description: 'Department still has users' } }
    }
  }
};

module.exports = { paths, schemas: { User: userSchema, BulkJob: bulkJobSchema } };
