'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/sales`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const lineSchema = {
  type: 'object',
  required: ['partId', 'quantity', 'unitPrice'],
  properties: {
    partId: { type: 'string', format: 'uuid' },
    quantity: { type: 'number', example: 500 },
    unitPrice: { type: 'number', example: 0.85 },
    discountPct: { type: 'number', example: 5 },
    taxRatePct: { type: 'number', example: 18 }
  }
};

const paths = {
  [`${base}/stats`]: { get: { tags: ['Reports'], summary: 'Order counts by status + total value', responses: { 200: { description: 'Fetched' } } } },

  [`${base}/quotations`]: {
    get: { tags: ['Quotations'], summary: 'List quotations', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Quotations'], summary: 'Create a quotation', description: 'Customer verified against CRM, parts against Master Data. Totals computed from lines (qty*price - discount% + tax%).', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { customerId: { type: 'string', format: 'uuid' }, lines: { type: 'array', items: lineSchema } } } } } }, responses: { 201: { description: 'Created' } } }
  },
  [`${base}/quotations/{id}`]: {
    get: { tags: ['Quotations'], summary: 'Quotation detail', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Quotations'], summary: 'Update a draft quotation', parameters: idParam, responses: { 200: { description: 'Updated' } } }
  },
  [`${base}/quotations/{id}/send`]: { post: { tags: ['Quotations'], summary: 'Send (DRAFT -> SENT)', parameters: idParam, responses: { 200: { description: 'Sent' } } } },
  [`${base}/quotations/{id}/accept`]: { post: { tags: ['Quotations'], summary: 'Accept (SENT -> ACCEPTED)', parameters: idParam, responses: { 200: { description: 'Accepted' } } } },
  [`${base}/quotations/{id}/reject`]: { post: { tags: ['Quotations'], summary: 'Reject', parameters: idParam, responses: { 200: { description: 'Rejected' } } } },
  [`${base}/quotations/{id}/convert`]: { post: { tags: ['Quotations'], summary: 'Convert an accepted quotation into a draft sales order', parameters: idParam, responses: { 201: { description: 'Converted' } } } },

  [`${base}/orders`]: {
    get: { tags: ['Orders'], summary: 'List sales orders', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Orders'], summary: 'Create a sales order', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/orders/{id}`]: {
    get: { tags: ['Orders'], summary: 'Order detail with lines (reserved / shipped / invoiced qty)', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Orders'], summary: 'Update a draft order', parameters: idParam, responses: { 200: { description: 'Updated' } } }
  },
  [`${base}/orders/{id}/confirm`]: {
    post: {
      tags: ['Orders'],
      summary: 'Confirm and reserve stock',
      description: 'Reserves each line against the Inventory service (refType SALES_ORDER). Any shortfall is returned in the response and emitted as sales.order.reservation_shortfall; it does not block confirmation.',
      parameters: idParam,
      responses: { 200: { description: 'Confirmed' } }
    }
  },
  [`${base}/orders/{id}/cancel`]: {
    post: { tags: ['Orders'], summary: 'Cancel and release reservations', description: 'Releases reservations and emits sales.order.cancelled (Inventory also auto-releases by ref).', parameters: idParam, responses: { 200: { description: 'Cancelled' } } }
  },
  [`${base}/orders/{id}/close`]: { post: { tags: ['Orders'], summary: 'Close a fulfilled order', parameters: idParam, responses: { 200: { description: 'Closed' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Sales Service',
    description: 'Quotation-to-order sales flow: CRM-verified quotations with pricing, conversion to sales orders, stock reservation on confirmation via the Inventory service, and fulfilment tracking driven by shipment events.',
    version: config.version,
    tags: [
      { name: 'Quotations', description: 'Quotations and conversion' },
      { name: 'Orders', description: 'Sales orders, reservation and fulfilment' },
      { name: 'Reports', description: 'Sales statistics' }
    ],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
