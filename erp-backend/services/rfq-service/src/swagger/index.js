'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const base = `${config.basePath}/rfq`;

const rfqSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'RFQ-2026-0031' },
    title: { type: 'string' },
    status: { type: 'string', enum: ['DRAFT', 'SENT', 'QUOTING', 'QUOTED', 'COMPARED', 'AWARDED', 'CLOSED', 'CANCELLED'] },
    currencyCode: { type: 'string' },
    validTill: { type: 'string', format: 'date-time', nullable: true },
    responseDeadline: { type: 'string', format: 'date-time', nullable: true },
    lineCount: { type: 'integer' },
    supplierCount: { type: 'integer' }
  }
};

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const supplierParams = [...idParam, { in: 'path', name: 'supplierId', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [base]: {
    get: { tags: ['RFQ'], summary: 'List RFQs', parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/search' }, { in: 'query', name: 'status', schema: { type: 'string' } }], responses: { 200: { description: 'RFQs fetched' } } },
    post: {
      tags: ['RFQ'],
      summary: 'Create an RFQ with line items',
      description: 'Every partId is verified against the Master Data Service before the RFQ is created. Starts in DRAFT.',
      requestBody: { required: true, content: { 'application/json': { schema: rfqSchema } } },
      responses: { 201: { description: 'Created' }, 400: { description: 'Unknown part id' } }
    }
  },
  [`${base}/stats`]: { get: { tags: ['RFQ'], summary: 'Counts by status', responses: { 200: { description: 'Statistics fetched' } } } },
  [`${base}/{id}`]: {
    get: { tags: ['RFQ'], summary: 'Get an RFQ with lines, suppliers and quotes', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['RFQ'], summary: 'Update RFQ header (DRAFT only)', parameters: idParam, responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['RFQ'], summary: 'Delete an RFQ (DRAFT only)', parameters: idParam, responses: { 200: { description: 'Deleted' } } }
  },
  [`${base}/{id}/suppliers`]: {
    post: {
      tags: ['Suppliers'],
      summary: 'Invite suppliers to quote',
      description: 'Only APPROVED, transactable suppliers (verified live against the Supplier Service) can be invited.',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { supplierIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } } } },
      responses: { 200: { description: 'Invited' }, 400: { description: 'Supplier not approved or missing' } }
    }
  },
  [`${base}/{id}/suppliers/{supplierId}`]: {
    delete: { tags: ['Suppliers'], summary: 'Remove an invited supplier (DRAFT only)', parameters: supplierParams, responses: { 200: { description: 'Removed' } } }
  },
  [`${base}/{id}/send`]: {
    post: {
      tags: ['Workflow'],
      summary: 'Send the RFQ (DRAFT -> SENT)',
      description: 'Requires at least one line and one invited supplier. Publishes rfq.created once per supplier so the Supplier Service scorecard can count quotesRequested.',
      parameters: idParam,
      responses: { 200: { description: 'Sent' }, 400: { description: 'No lines or no suppliers' } }
    }
  },
  [`${base}/{id}/cancel`]: {
    post: { tags: ['Workflow'], summary: 'Cancel an RFQ with a reason', parameters: idParam, responses: { 200: { description: 'Cancelled' } } }
  },
  [`${base}/{id}/suppliers/{supplierId}/quote`]: {
    post: {
      tags: ['Quotes'],
      summary: 'Record a supplier quote',
      description: 'Line-level pricing, MOQ, lead time and optional alternate part offer. Auto-advances RFQ status: SENT -> QUOTING as responses trickle in, -> QUOTED once every invited supplier has responded or declined.',
      parameters: supplierParams,
      responses: { 201: { description: 'Quote recorded' }, 409: { description: 'Already quoted' } }
    }
  },
  [`${base}/{id}/suppliers/{supplierId}/decline`]: {
    post: { tags: ['Quotes'], summary: 'Mark a supplier as declined to quote', parameters: supplierParams, responses: { 200: { description: 'Declined' } } }
  },
  [`${base}/{id}/compare`]: {
    get: {
      tags: ['Quotes'],
      summary: 'Comparison sheet: every quote, per line, cheapest and fastest highlighted',
      parameters: idParam,
      responses: { 200: { description: 'Comparison generated' } }
    }
  },
  [`${base}/{id}/compared`]: {
    post: { tags: ['Workflow'], summary: 'Mark the RFQ as compared (QUOTED -> COMPARED)', parameters: idParam, responses: { 200: { description: 'Marked' } } }
  },
  [`${base}/{id}/award`]: {
    post: {
      tags: ['Workflow'],
      summary: 'Award lines to suppliers (splits across suppliers supported)',
      description: 'Each award entry is one rfqLineId + supplierId pair, so a single RFQ can be split-awarded across multiple suppliers.',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['awards'],
              properties: {
                awards: {
                  type: 'array',
                  items: { type: 'object', properties: { rfqLineId: { type: 'string' }, supplierId: { type: 'string' }, quantity: { type: 'integer' } } }
                }
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Awarded' } }
    }
  },
  [`${base}/{id}/close`]: {
    post: { tags: ['Workflow'], summary: 'Close the RFQ (AWARDED -> CLOSED)', parameters: idParam, responses: { 200: { description: 'Closed' } } }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP RFQ Service',
    description: 'Multi-supplier enquiry: create with line items, invite approved suppliers, collect quotes, compare side by side, and award — with splits across suppliers supported.',
    version: config.version,
    tags: [
      { name: 'RFQ', description: 'RFQ CRUD' },
      { name: 'Suppliers', description: 'Invite and manage suppliers on an RFQ' },
      { name: 'Quotes', description: 'Quote submission and comparison' },
      { name: 'Workflow', description: 'Status transitions: send, cancel, compare, award, close' }
    ],
    paths,
    components: { schemas: { Rfq: rfqSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
