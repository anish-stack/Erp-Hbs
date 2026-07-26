'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const { getRegistry } = require('../config/services');

/** Gateway-owned OpenAPI document: routing map + health, plus links to each service spec. */
function buildGatewayDocument() {
  const registry = getRegistry();

  const paths = {
    '/health': {
      get: {
        tags: ['Gateway'],
        summary: 'Aggregate gateway health',
        security: [],
        responses: {
          200: { description: 'Gateway healthy' },
          503: { description: 'Gateway degraded' }
        }
      }
    },
    '/services': {
      get: {
        tags: ['Gateway'],
        summary: 'List mounted microservices and circuit state',
        responses: {
          200: { $ref: '#/components/responses/ServiceList' },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    }
  };

  return swagger.buildBaseDocument({
    title: 'ERP API Gateway',
    description: [
      'Single public entry point for the Enterprise ERP backend.',
      '',
      'All microservice routes are exposed under `/api/' + config.apiVersion + '`.',
      'Send `Authorization: Bearer <accessToken>` on every non-public route.',
      '',
      'Mounted services:',
      ...registry.map((s) => `- \`${config.apiPrefix}${s.prefix}\` → ${s.name}`)
    ].join('\n'),
    version: config.version,
    servers: [{ url: config.publicUrl, description: 'API Gateway' }],
    tags: [{ name: 'Gateway', description: 'Gateway operations' }],
    paths,
    components: {
      responses: {
        ServiceList: {
          description: 'Mounted services',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuccessResponse' }
            }
          }
        }
      }
    }
  });
}

module.exports = { buildGatewayDocument, swaggerUiOptions: swagger.swaggerUiOptions };
