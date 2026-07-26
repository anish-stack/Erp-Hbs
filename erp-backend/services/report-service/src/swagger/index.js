'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/reports`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${base}/definitions`]: { get: { tags: ['Reports'], summary: 'List available report keys + columns', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/runs`]: {
    get: { tags: ['Reports'], summary: 'List report runs (filter reportKey/status/requestedBy)', responses: { 200: { description: 'Fetched' } } },
    post: {
      tags: ['Reports'],
      summary: 'Queue a report generation',
      description: 'Returns immediately with status QUEUED; a BullMQ worker fetches data from the owning service (paginated across all pages), builds XLSX/CSV, and uploads it to the File service. Poll GET /runs/{id} for status and downloadPath once COMPLETED.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { reportKey: { type: 'string', example: 'sales-orders-register' }, format: { type: 'string', enum: ['XLSX', 'CSV'] }, params: { type: 'object' } } } } } },
      responses: { 201: { description: 'Queued' } }
    }
  },
  [`${base}/runs/{id}`]: { get: { tags: ['Reports'], summary: 'Report run status + download path', parameters: idParam, responses: { 200: { description: 'Fetched' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Report Service',
    description: 'Async Excel/CSV report generation via BullMQ. Available reports: sales-orders-register, purchase-orders-register, inventory-valuation, finance-outstanding, quality-rejections — each pulls paginated data live from its owning service and renders it, then stores the file via the File service.',
    version: config.version,
    tags: [{ name: 'Reports', description: 'Report definitions and generation runs' }],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
