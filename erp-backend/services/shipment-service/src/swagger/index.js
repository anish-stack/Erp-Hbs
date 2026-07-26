'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/shipment`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${base}/stats`]: { get: { tags: ['Shipments'], summary: 'Counts by status', responses: { 200: { description: 'Fetched' } } } },
  [base]: {
    get: { tags: ['Shipments'], summary: 'List shipments', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Shipments'], summary: 'Create a shipment manually', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/from-order`]: {
    post: {
      tags: ['Shipments'],
      summary: 'Create a shipment from a confirmed sales order',
      description: 'Mirrors each unshipped order line (carrying its reservationId), then raises Warehouse PICK tasks if AUTO_CREATE_PICK_TASKS is on. Idempotent: an order keeps at most one open shipment.',
      responses: { 201: { description: 'Created' } }
    }
  },
  [`${base}/{id}`]: { get: { tags: ['Shipments'], summary: 'Shipment detail with lines', parameters: idParam, responses: { 200: { description: 'Fetched' } } } },
  [`${base}/{id}/pick-tasks`]: { post: { tags: ['Shipments'], summary: 'Raise Warehouse PICK tasks for this shipment', parameters: idParam, responses: { 200: { description: 'Raised' } } } },
  [`${base}/{id}/pick`]: { post: { tags: ['Shipments'], summary: 'Mark picked (per-line picked quantities, defaults to full)', parameters: idParam, responses: { 200: { description: 'Picked' } } } },
  [`${base}/{id}/pack`]: { post: { tags: ['Shipments'], summary: 'Mark packed (package count / weight)', parameters: idParam, responses: { 200: { description: 'Packed' } } } },
  [`${base}/{id}/dispatch`]: {
    post: {
      tags: ['Shipments'],
      summary: 'Dispatch: converts reservations to actual stock issues',
      description: 'Each line with a reservationId calls Inventory reservation fulfil (reserved -> issued); lines without one issue directly. A failed stock conversion aborts dispatch. Emits shipment.dispatched with shipped lines for Sales to roll fulfilment.',
      parameters: idParam,
      responses: { 200: { description: 'Dispatched' }, 503: { description: 'Inventory issue failed' } }
    }
  },
  [`${base}/{id}/deliver`]: { post: { tags: ['Shipments'], summary: 'Mark delivered', parameters: idParam, responses: { 200: { description: 'Delivered' } } } },
  [`${base}/{id}/cancel`]: { post: { tags: ['Shipments'], summary: 'Cancel (before dispatch)', parameters: idParam, responses: { 200: { description: 'Cancelled' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Shipment Service',
    description: 'Pick / pack / dispatch tracking for sales orders: auto-creates shipments on order confirmation, raises Warehouse pick tasks, and on dispatch converts Inventory reservations into actual stock issues while feeding shipment.dispatched back to Sales for fulfilment roll-up.',
    version: config.version,
    tags: [{ name: 'Shipments', description: 'Shipment lifecycle' }],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
