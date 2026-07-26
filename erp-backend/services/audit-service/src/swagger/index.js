'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');
const auditSpec = require('./audit.swagger');

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Audit Service',
    description:
      'Append-only audit trail. Subscribes to every event on the exchange, deduplicates by event id, and exposes search, entity timelines, cross-service traces, rollups and Excel export.',
    version: config.version,
    tags: [
      { name: 'Audit Trail', description: 'Search, timelines and traces' },
      { name: 'Analytics', description: 'Statistics and daily rollups' },
      { name: 'Export', description: 'Queued Excel exports' },
      { name: 'Operations', description: 'Dead letter handling' }
    ],
    paths: auditSpec.paths,
    components: { schemas: auditSpec.schemas }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
