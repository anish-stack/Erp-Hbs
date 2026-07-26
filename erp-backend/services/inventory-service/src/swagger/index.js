'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const base = `${config.basePath}/inventory`;

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const stockSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    partId: { type: 'string', format: 'uuid' },
    partCode: { type: 'string', example: 'RES-0603-10K' },
    warehouseId: { type: 'string', format: 'uuid' },
    binLocation: { type: 'string', example: 'A-12-3' },
    onHand: { type: 'string', example: '5000.000' },
    reserved: { type: 'string', example: '1200.000' },
    available: { type: 'string', example: '3800.000' },
    avgCost: { type: 'string', example: '0.4200' },
    totalValue: { type: 'string', example: '2100.00' },
    reorderPoint: { type: 'string', example: '1000.000' },
    belowReorder: { type: 'boolean' }
  }
};

const receiptBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['partId', 'quantity'],
        properties: {
          partId: { type: 'string', format: 'uuid' },
          warehouseId: { type: 'string', format: 'uuid' },
          quantity: { type: 'number', example: 5000 },
          unitCost: { type: 'number', example: 0.42 },
          lotNumber: { type: 'string', example: 'LOT-2426-A' },
          dateCode: { type: 'string', example: '2426' },
          mslLevel: { type: 'string', example: 'MSL3' },
          refType: { type: 'string', enum: ['GRN', 'MANUAL'], example: 'GRN' },
          refId: { type: 'string', format: 'uuid' },
          refCode: { type: 'string', example: 'GRN-2026-0031' }
        }
      }
    }
  }
};

const paths = {
  [`${base}/stock`]: {
    get: {
      tags: ['Stock'],
      summary: 'List stock positions',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { in: 'query', name: 'warehouseId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'partId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'belowReorder', schema: { type: 'boolean' } },
        { in: 'query', name: 'hasStock', schema: { type: 'boolean' } }
      ],
      responses: { 200: { description: 'Positions fetched' } }
    }
  },
  [`${base}/stock/{id}`]: {
    get: { tags: ['Stock'], summary: 'Position detail with open lots and recent movements', parameters: idParam, responses: { 200: { description: 'Fetched' } } }
  },
  [`${base}/stock/by-part/{partId}`]: {
    get: {
      tags: ['Stock'],
      summary: 'Aggregated stock of a part across warehouses',
      parameters: [{ in: 'path', name: 'partId', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: { 200: { description: 'Fetched' } }
    }
  },
  [`${base}/stock/{id}/reorder`]: {
    put: { tags: ['Stock'], summary: 'Set min / reorder point / reorder qty / max', parameters: idParam, responses: { 200: { description: 'Updated' } } }
  },
  [`${base}/availability`]: {
    get: {
      tags: ['Stock'],
      summary: 'Availability probe used by Sales before confirming an order',
      parameters: [
        { in: 'query', name: 'partId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'warehouseId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'quantity', schema: { type: 'number' } }
      ],
      responses: { 200: { description: 'Availability checked' } }
    }
  },
  [`${base}/low-stock`]: {
    get: { tags: ['Stock'], summary: 'Positions at or below their reorder point', responses: { 200: { description: 'Fetched' } } }
  },
  [`${base}/stats`]: {
    get: { tags: ['Stock'], summary: 'Position count and value totals by warehouse', responses: { 200: { description: 'Fetched' } } }
  },

  [`${base}/receipts`]: {
    post: {
      tags: ['Ledger'],
      summary: 'Receive stock (creates a lot + RECEIPT movement)',
      description: 'Canonical stock-in. Purchase/GRN completion posts here with full line data. A GRN reference can only be received once.',
      requestBody: receiptBody,
      responses: { 201: { description: 'Stock received' }, 409: { description: 'GRN already received' } }
    }
  },
  [`${base}/issues`]: {
    post: { tags: ['Ledger'], summary: 'Issue stock (FIFO lot consumption + ISSUE movement)', responses: { 201: { description: 'Stock issued' }, 409: { description: 'Insufficient stock' } } }
  },
  [`${base}/transfers`]: {
    post: { tags: ['Ledger'], summary: 'Inter-warehouse transfer (TRANSFER_OUT + TRANSFER_IN)', responses: { 201: { description: 'Transferred' } } }
  },
  [`${base}/movements`]: {
    get: { tags: ['Ledger'], summary: 'Query the append-only stock movement ledger', responses: { 200: { description: 'Fetched' } } }
  },
  [`${base}/lots`]: {
    get: { tags: ['Lots'], summary: 'List stock lots (batch / date-code traceability)', responses: { 200: { description: 'Fetched' } } }
  },
  [`${base}/lots/{id}`]: {
    get: { tags: ['Lots'], summary: 'Lot detail', parameters: idParam, responses: { 200: { description: 'Fetched' } } }
  },

  [`${base}/reservations`]: {
    get: { tags: ['Reservations'], summary: 'List reservations', responses: { 200: { description: 'Fetched' } } },
    post: {
      tags: ['Reservations'],
      summary: 'Soft-allocate stock for a sales order',
      description: 'Raises reserved and lowers available; on-hand is untouched until fulfilment.',
      responses: { 201: { description: 'Reserved' }, 409: { description: 'Insufficient available stock' } }
    }
  },
  [`${base}/reservations/{id}/release`]: {
    post: { tags: ['Reservations'], summary: 'Release an active reservation', parameters: idParam, responses: { 200: { description: 'Released' } } }
  },
  [`${base}/reservations/{id}/fulfill`]: {
    post: { tags: ['Reservations'], summary: 'Fulfil a reservation (reserved -> issued out of stock)', parameters: idParam, responses: { 200: { description: 'Fulfilled' } } }
  },

  [`${base}/adjustments`]: {
    get: { tags: ['Adjustments'], summary: 'List stock adjustments', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Adjustments'], summary: 'Create a cycle-count / damage adjustment (DRAFT)', description: 'System quantity is snapshotted per line so the delta is stable.', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/adjustments/{id}`]: {
    get: { tags: ['Adjustments'], summary: 'Adjustment detail', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Adjustments'], summary: 'Edit a draft adjustment', parameters: idParam, responses: { 200: { description: 'Updated' } } }
  },
  [`${base}/adjustments/{id}/submit`]: {
    post: { tags: ['Adjustments'], summary: 'Submit for approval', parameters: idParam, responses: { 200: { description: 'Submitted' } } }
  },
  [`${base}/adjustments/{id}/approve`]: {
    post: { tags: ['Adjustments'], summary: 'Approve', parameters: idParam, responses: { 200: { description: 'Approved' } } }
  },
  [`${base}/adjustments/{id}/reject`]: {
    post: { tags: ['Adjustments'], summary: 'Reject with a reason', parameters: idParam, responses: { 200: { description: 'Rejected' } } }
  },
  [`${base}/adjustments/{id}/post`]: {
    post: {
      tags: ['Adjustments'],
      summary: 'Post approved deltas to the ledger',
      description: 'Each non-zero line becomes an ADJUSTMENT_IN / ADJUSTMENT_OUT movement.',
      parameters: idParam,
      responses: { 200: { description: 'Posted' } }
    }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Inventory Service',
    description:
      'Stock ledger for an electronic-components trading business: lot / date-code / MSL traceable positions, an append-only movement ledger with moving-average valuation, soft reservations for sales, inter-warehouse transfers and approval-gated cycle-count adjustments.',
    version: config.version,
    tags: [
      { name: 'Stock', description: 'Positions, availability and reorder rules' },
      { name: 'Ledger', description: 'Receipts, issues, transfers and movements' },
      { name: 'Lots', description: 'Batch, date-code and MSL traceability' },
      { name: 'Reservations', description: 'Soft allocations for sales orders' },
      { name: 'Adjustments', description: 'Cycle count, damage and write-off with approval' }
    ],
    paths,
    components: { schemas: { StockItem: stockSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
