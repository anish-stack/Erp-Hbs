'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/dashboard`;

const paths = {
  [`${base}/summary`]: {
    get: {
      tags: ['Dashboard'],
      summary: "Role-aware dashboard summary (all the caller's widgets, Redis-cached)",
      description: 'Widget set defaults from the caller\'s role (sales/purchase/warehouse/finance/quality/admin); pass ?widgets=key1,key2 to override. Each widget degrades to {available:false} on upstream failure rather than breaking the response.',
      parameters: [{ in: 'query', name: 'widgets', schema: { type: 'string' }, description: 'Comma-separated widget keys override' }],
      responses: { 200: { description: 'Fetched' } }
    }
  },
  [`${base}/widgets`]: { get: { tags: ['Dashboard'], summary: 'Widget catalog + role -> widget mapping', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/widgets/{key}`]: {
    get: {
      tags: ['Dashboard'],
      summary: 'Single widget data (Redis-cached, WIDGET_CACHE_TTL seconds)',
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' }, example: 'sales-summary' }],
      responses: { 200: { description: 'Fetched' } }
    }
  },
  [`${base}/layout`]: {
    get: { tags: ['Dashboard'], summary: "Caller's saved widget layout (falls back to role default)", responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Dashboard'], summary: 'Save a custom widget order/selection for the caller', responses: { 200: { description: 'Saved' } } }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Dashboard Service',
    description: 'Role-aware widget aggregation across every service (sales, purchase, inventory, quality, finance, shipment), each widget backed by that service\'s /stats endpoint and cached in Redis for a few seconds so the dashboard stays fast under load.',
    version: config.version,
    tags: [{ name: 'Dashboard', description: 'Widgets and layout' }],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
