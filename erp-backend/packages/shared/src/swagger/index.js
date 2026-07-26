'use strict';

const env = require('../config/env');

/** Reusable OpenAPI fragments shared by every service. */
const commonComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  parameters: {
    page: {
      in: 'query',
      name: 'page',
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number'
    },
    limit: {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      description: 'Records per page'
    },
    search: {
      in: 'query',
      name: 'search',
      schema: { type: 'string' },
      description: 'Free text search'
    },
    sortBy: {
      in: 'query',
      name: 'sortBy',
      schema: { type: 'string', default: 'createdAt' },
      description: 'Sort field'
    },
    sortOrder: {
      in: 'query',
      name: 'sortOrder',
      schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
      description: 'Sort direction'
    }
  },
  schemas: {
    SuccessResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Success' },
        data: { type: 'object', nullable: true },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    },
    PaginatedResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPrevPage: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Validation failed' },
        details: { type: 'object', nullable: true },
        requestId: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  },
  responses: {
    BadRequest: {
      description: 'Bad request',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    },
    Unauthorized: {
      description: 'Authentication required',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    },
    Forbidden: {
      description: 'Insufficient permissions',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    },
    NotFound: {
      description: 'Resource not found',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    },
    ValidationError: {
      description: 'Validation failed',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    },
    ServerError: {
      description: 'Internal server error',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
    }
  }
};

/**
 * Builds a base OpenAPI 3 document for a service.
 * @param {object} options { title, description, version, servers, tags, paths, components }
 */
function buildBaseDocument(options = {}) {
  return {
    openapi: '3.0.3',
    info: {
      title: options.title || 'ERP Service API',
      description: options.description || 'Enterprise ERP Backend',
      version: options.version || '1.0.0',
      contact: { name: 'ERP Platform Team' }
    },
    servers: options.servers || [
      {
        url: `${env.str('GATEWAY_PUBLIC_URL', 'http://localhost:4000')}/api/${env.str('API_VERSION', 'v1')}`,
        description: 'API Gateway'
      }
    ],
    tags: options.tags || [],
    security: [{ bearerAuth: [] }],
    paths: options.paths || {},
    components: {
      ...commonComponents,
      ...(options.components || {}),
      schemas: { ...commonComponents.schemas, ...((options.components || {}).schemas || {}) },
      parameters: { ...commonComponents.parameters, ...((options.components || {}).parameters || {}) }
    }
  };
}

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'ERP API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true
  }
};

module.exports = { buildBaseDocument, commonComponents, swaggerUiOptions };
