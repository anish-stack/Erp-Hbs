'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const base = `${config.basePath}/warehouse`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const warehouseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'WH-DEL-01' },
    name: { type: 'string', example: 'Delhi Central Warehouse' },
    type: { type: 'string', enum: ['MAIN', 'BRANCH', 'TRANSIT', 'QUARANTINE', 'RETURNS', 'VIRTUAL'] },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
    isDefault: { type: 'boolean' },
    mslControlled: { type: 'boolean', description: 'Moisture-sensitive device controls enforced' }
  }
};

const paths = {
  [base]: {
    get: {
      tags: ['Warehouses'],
      summary: 'List warehouses',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'status', schema: { type: 'string' } },
        { in: 'query', name: 'type', schema: { type: 'string' } }
      ],
      responses: { 200: { description: 'Fetched' } }
    },
    post: {
      tags: ['Warehouses'],
      summary: 'Create a warehouse',
      requestBody: { required: true, content: { 'application/json': { schema: warehouseSchema } } },
      responses: { 201: { description: 'Created' }, 409: { description: 'Duplicate code' } }
    }
  },
  [`${base}/options`]: { get: { tags: ['Warehouses'], summary: 'Active warehouses for dropdowns (cached)', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/stats`]: { get: { tags: ['Warehouses'], summary: 'Counts by status and type', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/{id}`]: {
    get: { tags: ['Warehouses'], summary: 'Warehouse detail with zones', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Warehouses'], summary: 'Update a warehouse', parameters: idParam, responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Warehouses'], summary: 'Soft delete (blocked while bins exist)', parameters: idParam, responses: { 200: { description: 'Deleted' }, 409: { description: 'Has bins' } } }
  },
  [`${base}/{id}/activate`]: { post: { tags: ['Warehouses'], summary: 'Activate', parameters: idParam, responses: { 200: { description: 'Activated' } } } },
  [`${base}/{id}/deactivate`]: { post: { tags: ['Warehouses'], summary: 'Deactivate', parameters: idParam, responses: { 200: { description: 'Deactivated' } } } },
  [`${base}/{id}/set-default`]: { post: { tags: ['Warehouses'], summary: 'Set as the default warehouse', parameters: idParam, responses: { 200: { description: 'Default set' } } } },

  [`${base}/{id}/zones`]: {
    get: { tags: ['Zones'], summary: 'List zones', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Zones'], summary: 'Create a zone (RECEIVING / STORAGE / DISPATCH / QUARANTINE ...)', parameters: idParam, responses: { 201: { description: 'Created' } } }
  },
  [`${base}/zones/{zoneId}`]: {
    put: { tags: ['Zones'], summary: 'Update a zone', responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Zones'], summary: 'Delete a zone (blocked while bins exist)', responses: { 200: { description: 'Deleted' } } }
  },

  [`${base}/{id}/bins`]: {
    get: { tags: ['Bins'], summary: 'List bins', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Bins'], summary: 'Create a bin', parameters: idParam, responses: { 201: { description: 'Created' } } }
  },
  [`${base}/{id}/bins/bulk`]: {
    post: {
      tags: ['Bins'],
      summary: 'Bulk-generate a grid of bins',
      description: 'Generates codes from aisle/rack/shelf/level ranges, e.g. aisles ["A","B"], racks 4, shelves 3 -> A-01-1 .. B-04-3. Capped at 2000 per call.',
      parameters: idParam,
      responses: { 201: { description: 'Created' } }
    }
  },
  [`${base}/{id}/bins/suggest`]: {
    get: { tags: ['Bins'], summary: 'Suggest an available bin (least occupied first)', parameters: idParam, responses: { 200: { description: 'Suggested' } } }
  },
  [`${base}/bins/{binId}`]: {
    get: { tags: ['Bins'], summary: 'Bin detail', responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Bins'], summary: 'Update a bin', responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Bins'], summary: 'Delete a bin (blocked while it holds stock)', responses: { 200: { description: 'Deleted' } } }
  },
  [`${base}/bins/{binId}/block`]: { post: { tags: ['Bins'], summary: 'Block a bin', responses: { 200: { description: 'Blocked' } } } },
  [`${base}/bins/{binId}/unblock`]: { post: { tags: ['Bins'], summary: 'Unblock a bin', responses: { 200: { description: 'Unblocked' } } } },

  [`${base}/{id}/putaway-rules`]: {
    get: { tags: ['Putaway'], summary: 'List putaway rules', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Putaway'], summary: 'Create a putaway rule', parameters: idParam, responses: { 201: { description: 'Created' } } }
  },
  [`${base}/putaway-rules/{ruleId}`]: {
    put: { tags: ['Putaway'], summary: 'Update a putaway rule', responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Putaway'], summary: 'Delete a putaway rule', responses: { 200: { description: 'Deleted' } } }
  },
  [`${base}/{id}/putaway/suggest`]: {
    get: {
      tags: ['Putaway'],
      summary: 'Resolve the best destination bin for an incoming part',
      description: 'Walks active rules by priority (part match, then category, then default), honouring target zone and MSL, and falls back to any available bin.',
      parameters: [
        ...idParam,
        { in: 'query', name: 'partId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'categoryId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'needUnits', schema: { type: 'integer' } },
        { in: 'query', name: 'mslRequired', schema: { type: 'boolean' } }
      ],
      responses: { 200: { description: 'Resolved' } }
    }
  },

  [`${base}/tasks`]: {
    get: { tags: ['Tasks'], summary: 'List warehouse tasks', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Tasks'], summary: 'Create a task (PUTAWAY / PICK / MOVE / COUNT / REPLENISH)', description: 'A PUTAWAY task with no destination auto-suggests one from the putaway rules.', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/tasks/{taskId}`]: { get: { tags: ['Tasks'], summary: 'Task detail', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/tasks/{taskId}/assign`]: { post: { tags: ['Tasks'], summary: 'Assign to a worker', responses: { 200: { description: 'Assigned' } } } },
  [`${base}/tasks/{taskId}/start`]: { post: { tags: ['Tasks'], summary: 'Start (IN_PROGRESS)', responses: { 200: { description: 'Started' } } } },
  [`${base}/tasks/{taskId}/complete`]: {
    post: {
      tags: ['Tasks'],
      summary: 'Complete a task',
      description: 'PUTAWAY / MOVE / REPLENISH tasks call the Inventory service to move stock between bins, then update bin occupancy. A failed stock move aborts completion.',
      responses: { 200: { description: 'Completed' }, 503: { description: 'Inventory move failed' } }
    }
  },
  [`${base}/tasks/{taskId}/cancel`]: { post: { tags: ['Tasks'], summary: 'Cancel a task', responses: { 200: { description: 'Cancelled' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Warehouse Service',
    description:
      'Physical topology for the inventory ledger: warehouses, zones and bins with capacity and MSL zoning, priority-based putaway rules with destination resolution, and warehouse tasks (putaway / pick / move / count) that move stock between bins via the Inventory service.',
    version: config.version,
    tags: [
      { name: 'Warehouses', description: 'Warehouse master and status' },
      { name: 'Zones', description: 'Receiving, storage, dispatch and quarantine zones' },
      { name: 'Bins', description: 'Bin master, bulk generation and occupancy' },
      { name: 'Putaway', description: 'Putaway rules and destination resolution' },
      { name: 'Tasks', description: 'Putaway, pick, move and count tasks' }
    ],
    paths,
    components: { schemas: { Warehouse: warehouseSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
