'use strict';

const config = require('../config');

const base = config.apiPrefix;

const tokenSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    tokenType: { type: 'string', example: 'Bearer' },
    expiresIn: { type: 'integer', example: 900 },
    refreshExpiresIn: { type: 'integer', example: 604800 }
  }
};

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    employeeCode: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string', nullable: true },
    fullName: { type: 'string' },
    email: { type: 'string', format: 'email' },
    mobile: { type: 'string', nullable: true },
    designation: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] },
    mustChangePassword: { type: 'boolean' },
    role: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        code: { type: 'string', example: 'SALES_MANAGER' },
        name: { type: 'string' },
        landingPath: { type: 'string', example: '/dashboard/sales' }
      }
    },
    permissions: { type: 'array', items: { type: 'string', example: 'sales.view' } }
  }
};

function body(schemaRef, example) {
  return {
    required: true,
    content: { 'application/json': { schema: schemaRef, example } }
  };
}

const paths = {
  [`${base}/login`]: {
    post: {
      tags: ['Authentication'],
      summary: 'Sign in with email and password',
      security: [],
      requestBody: body(
        {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          }
        },
        { email: 'admin@erp.local', password: 'Admin@12345' }
      ),
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: { user: userSchema, tokens: tokenSchema }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { description: 'Account locked, suspended or inactive' },
        422: { $ref: '#/components/responses/ValidationError' },
        429: { description: 'Too many login attempts' }
      }
    }
  },

  [`${base}/refresh`]: {
    post: {
      tags: ['Authentication'],
      summary: 'Rotate refresh token and issue a new access token',
      description: 'Reusing an already-rotated refresh token revokes every session of that user.',
      security: [],
      requestBody: body({
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } }
      }),
      responses: {
        200: { description: 'New token pair issued' },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/logout`]: {
    post: {
      tags: ['Authentication'],
      summary: 'Sign out of the current session',
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: { type: 'object', properties: { refreshToken: { type: 'string' } } }
          }
        }
      },
      responses: {
        200: { description: 'Logged out' },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/logout-all`]: {
    post: {
      tags: ['Authentication'],
      summary: 'Revoke every active session of the current user',
      responses: {
        200: { description: 'All sessions revoked' },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/me`]: {
    get: {
      tags: ['Authentication'],
      summary: 'Current user profile with role and permissions',
      responses: {
        200: {
          description: 'Profile fetched',
          content: { 'application/json': { schema: userSchema } }
        },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/permissions`]: {
    get: {
      tags: ['Authentication'],
      summary: 'Effective permission codes of the current user (Redis cached)',
      responses: {
        200: { description: 'Permissions fetched' },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/sessions`]: {
    get: {
      tags: ['Sessions'],
      summary: 'List active sessions of the current user',
      responses: {
        200: { description: 'Sessions fetched' },
        401: { $ref: '#/components/responses/Unauthorized' }
      }
    }
  },

  [`${base}/sessions/{jti}`]: {
    delete: {
      tags: ['Sessions'],
      summary: 'Revoke one session by refresh token id',
      parameters: [
        { in: 'path', name: 'jti', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: {
        200: { description: 'Session revoked' },
        404: { $ref: '#/components/responses/NotFound' }
      }
    }
  },

  [`${base}/change-password`]: {
    post: {
      tags: ['Password'],
      summary: 'Change password (revokes all sessions)',
      requestBody: body({
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password' }
        }
      }),
      responses: {
        200: { description: 'Password changed' },
        401: { $ref: '#/components/responses/Unauthorized' },
        422: { $ref: '#/components/responses/ValidationError' }
      }
    }
  },

  [`${base}/forgot-password`]: {
    post: {
      tags: ['Password'],
      summary: 'Request a password reset link',
      description: 'Always returns the same message to prevent account enumeration.',
      security: [],
      requestBody: body({
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } }
      }),
      responses: { 200: { description: 'Reset email queued if the account exists' } }
    }
  },

  [`${base}/reset-password`]: {
    post: {
      tags: ['Password'],
      summary: 'Set a new password using the emailed token',
      security: [],
      requestBody: body({
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string', minLength: 64, maxLength: 64 },
          newPassword: { type: 'string', format: 'password' }
        }
      }),
      responses: {
        200: { description: 'Password reset successful' },
        400: { $ref: '#/components/responses/BadRequest' }
      }
    }
  },

  [`${base}/send-otp`]: {
    post: {
      tags: ['OTP'],
      summary: 'Send a one-time code by email',
      security: [],
      requestBody: body({
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
          purpose: { type: 'string', enum: ['login', 'password_reset', 'email_verify'] }
        }
      }),
      responses: { 200: { description: 'OTP queued if the account exists' } }
    }
  },

  [`${base}/verify-otp`]: {
    post: {
      tags: ['OTP'],
      summary: 'Verify a one-time code (issues tokens when purpose is login)',
      security: [],
      requestBody: body({
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email' },
          code: { type: 'string', example: '482913' },
          purpose: { type: 'string', enum: ['login', 'password_reset', 'email_verify'] }
        }
      }),
      responses: {
        200: { description: 'OTP verified' },
        400: { $ref: '#/components/responses/BadRequest' },
        429: { description: 'Too many invalid attempts' }
      }
    }
  },

  [`${base}/register`]: {
    post: {
      tags: ['Authentication'],
      summary: 'Create a user account (requires user.create permission)',
      requestBody: body({
        type: 'object',
        required: ['employeeCode', 'firstName', 'email', 'password', 'roleId'],
        properties: {
          employeeCode: { type: 'string', example: 'EMP1042' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          mobile: { type: 'string' },
          designation: { type: 'string' },
          password: { type: 'string', format: 'password' },
          roleId: { type: 'string', format: 'uuid' },
          departmentId: { type: 'string', format: 'uuid' },
          mustChangePassword: { type: 'boolean', default: true },
          sendCredentials: { type: 'boolean', default: false }
        }
      }),
      responses: {
        201: { description: 'User created' },
        403: { $ref: '#/components/responses/Forbidden' },
        409: { description: 'Email, mobile or employee code already exists' }
      }
    }
  }
};

module.exports = { paths, schemas: { AuthUser: userSchema, TokenPair: tokenSchema } };
