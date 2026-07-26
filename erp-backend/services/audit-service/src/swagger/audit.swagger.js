'use strict';

const config = require('../config');

const base = `${config.basePath}/audit`;

const auditSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    eventId: { type: 'string', format: 'uuid', description: 'Broker envelope id, unique (dedupe key)' },
    correlationId: { type: 'string', format: 'uuid', nullable: true },
    event: { type: 'string', example: 'purchase.order.approved' },
    source: { type: 'string', example: 'purchase-service' },
    channel: { type: 'string', enum: ['EVENT', 'API', 'SYSTEM'] },
    entity: { type: 'string', example: 'purchase.order' },
    entityId: { type: 'string', nullable: true },
    action: {
      type: 'string',
      enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'STATUS_CHANGE', 'PERMISSION_CHANGE', 'SECURITY', 'OTHER']
    },
    severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
    actorId: { type: 'string', nullable: true },
    actorEmail: { type: 'string', nullable: true },
    summary: { type: 'string', example: 'APPROVE on purchase.order (PO-2026-0142) status=APPROVED' },
    payload: { type: 'object', nullable: true },
    changes: { type: 'array', nullable: true, items: { type: 'string' } },
    ipAddress: { type: 'string', nullable: true },
    occurredAt: { type: 'string', format: 'date-time' }
  }
};

const filterParams = [
  { in: 'query', name: 'entity', schema: { type: 'string' }, example: 'purchase.order' },
  { in: 'query', name: 'entityId', schema: { type: 'string' } },
  { in: 'query', name: 'action', schema: { type: 'string' } },
  { in: 'query', name: 'severity', schema: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] } },
  { in: 'query', name: 'actorId', schema: { type: 'string', format: 'uuid' } },
  { in: 'query', name: 'source', schema: { type: 'string' } },
  { in: 'query', name: 'event', schema: { type: 'string' } },
  { in: 'query', name: 'correlationId', schema: { type: 'string', format: 'uuid' } },
  { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' } },
  { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' } }
];

const paths = {
  [base]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Search the audit trail',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { $ref: '#/components/parameters/sortOrder' },
        ...filterParams
      ],
      responses: {
        200: { description: 'Entries fetched', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } },
        403: { $ref: '#/components/responses/Forbidden' }
      }
    },
    post: {
      tags: ['Audit Trail'],
      summary: 'Record an entry over HTTP',
      description: 'Fallback for actions that never touch the event bus. Idempotent on eventId.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['event', 'entity'],
              properties: {
                event: { type: 'string', example: 'settings.updated' },
                entity: { type: 'string', example: 'setting' },
                entityId: { type: 'string' },
                action: { type: 'string', example: 'UPDATE' },
                severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'] },
                summary: { type: 'string' },
                changes: { type: 'array', items: { type: 'string' } },
                data: { type: 'object' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Entry recorded (or duplicate ignored)' } }
    }
  },

  [`${base}/me`]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Your own activity trail',
      parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/limit' }],
      responses: { 200: { description: 'Activity fetched' } }
    }
  },

  [`${base}/stats`]: {
    get: {
      tags: ['Analytics'],
      summary: 'Counts by action, severity, entity and top actors',
      parameters: filterParams,
      responses: { 200: { description: 'Statistics fetched' } }
    }
  },

  [`${base}/summaries`]: {
    get: {
      tags: ['Analytics'],
      summary: 'Pre-aggregated daily rollups (dashboard friendly)',
      parameters: [
        { in: 'query', name: 'entity', schema: { type: 'string' } },
        { in: 'query', name: 'dateFrom', schema: { type: 'string', format: 'date' } },
        { in: 'query', name: 'dateTo', schema: { type: 'string', format: 'date' } }
      ],
      responses: { 200: { description: 'Summaries fetched' } }
    }
  },

  [`${base}/entity/{entity}/{entityId}`]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Full timeline of one record',
      description: 'Example: /audit/entity/purchase.order/9f2c... returns every change to that PO.',
      parameters: [
        { in: 'path', name: 'entity', required: true, schema: { type: 'string' } },
        { in: 'path', name: 'entityId', required: true, schema: { type: 'string' } },
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' }
      ],
      responses: { 200: { description: 'Timeline fetched' } }
    }
  },

  [`${base}/trace/{correlationId}`]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Cross-service trace for one correlation id',
      description: 'Shows the full chain, e.g. RFQ approved -> PO created -> stock reserved -> invoice generated.',
      parameters: [
        { in: 'path', name: 'correlationId', required: true, schema: { type: 'string', format: 'uuid' } }
      ],
      responses: { 200: { description: 'Trace fetched' }, 404: { $ref: '#/components/responses/NotFound' } }
    }
  },

  [`${base}/user/{userId}`]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Activity of one user',
      description: 'Own activity needs no permission; other users require audit.view.',
      parameters: [
        { in: 'path', name: 'userId', required: true, schema: { type: 'string', format: 'uuid' } },
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' }
      ],
      responses: { 200: { description: 'Activity fetched' }, 403: { $ref: '#/components/responses/Forbidden' } }
    }
  },

  [`${base}/exports`]: {
    post: {
      tags: ['Export'],
      summary: 'Queue an Excel export of the filtered trail',
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { type: 'object', properties: { entity: { type: 'string' }, dateFrom: { type: 'string', format: 'date' }, dateTo: { type: 'string', format: 'date' } } } } }
      },
      responses: { 202: { description: 'Export queued' } }
    }
  },

  [`${base}/exports/{exportJobId}`]: {
    get: {
      tags: ['Export'],
      summary: 'Export progress',
      parameters: [{ in: 'path', name: 'exportJobId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Status fetched' } }
    }
  },

  [`${base}/exports/{exportJobId}/download`]: {
    get: {
      tags: ['Export'],
      summary: 'Download a completed export',
      parameters: [{ in: 'path', name: 'exportJobId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'XLSX file' }, 404: { description: 'Expired or missing' } }
    }
  },

  [`${base}/dead-letters`]: {
    get: {
      tags: ['Operations'],
      summary: 'Events that could not be recorded',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { in: 'query', name: 'resolved', schema: { type: 'boolean' } }
      ],
      responses: { 200: { description: 'Dead letters fetched' } }
    }
  },

  [`${base}/dead-letters/{id}/resolve`]: {
    post: {
      tags: ['Operations'],
      summary: 'Mark a dead letter as handled',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Resolved' } }
    }
  },

  [`${base}/{id}`]: {
    get: {
      tags: ['Audit Trail'],
      summary: 'Get one audit entry with its full payload',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        200: { description: 'Entry fetched', content: { 'application/json': { schema: auditSchema } } },
        404: { $ref: '#/components/responses/NotFound' }
      }
    }
  }
};

module.exports = { paths, schemas: { AuditEntry: auditSchema } };
