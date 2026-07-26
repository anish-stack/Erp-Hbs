'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const leadBase = `${config.basePath}/leads`;
const custBase = `${config.basePath}/customers`;

const leadSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'LEAD-M1A2B3-9F3C' },
    companyName: { type: 'string' },
    contactName: { type: 'string' },
    stage: { type: 'string', enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] },
    probability: { type: 'integer', example: 40 },
    estimatedValue: { type: 'string', nullable: true },
    weightedValue: { type: 'number', nullable: true },
    ownerId: { type: 'string', nullable: true },
    nextFollowUpAt: { type: 'string', format: 'date-time', nullable: true }
  }
};

const customerSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'CUS-0042' },
    legalName: { type: 'string' },
    status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ON_HOLD', 'BLACKLISTED'] },
    segment: { type: 'string', enum: ['ENTERPRISE', 'SMB', 'STARTUP', 'GOVERNMENT', 'RETAIL'] },
    credit: {
      type: 'object',
      properties: {
        limit: { type: 'string' }, used: { type: 'string' }, available: { type: 'string' },
        utilisationPercent: { type: 'number' }, breached: { type: 'boolean' }
      }
    }
  }
};

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const childParams = [...idParam, { in: 'path', name: 'childId', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${leadBase}/pipeline`]: {
    get: { tags: ['Pipeline'], summary: 'Lead counts and value by stage, win rate', responses: { 200: { description: 'Summary fetched' } } }
  },
  [`${leadBase}/mine`]: {
    get: { tags: ['Leads'], summary: 'Leads owned by the current user', responses: { 200: { description: 'Leads fetched' } } }
  },
  [leadBase]: {
    get: { tags: ['Leads'], summary: 'List leads', parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/search' }, { in: 'query', name: 'stage', schema: { type: 'string' } }], responses: { 200: { description: 'Leads fetched' } } },
    post: { tags: ['Leads'], summary: 'Create a lead (always starts at NEW)', requestBody: { required: true, content: { 'application/json': { schema: leadSchema } } }, responses: { 201: { description: 'Lead created' } } }
  },
  [`${leadBase}/{id}`]: {
    get: { tags: ['Leads'], summary: 'Get a lead', parameters: idParam, responses: { 200: { description: 'Lead fetched' } } },
    put: { tags: ['Leads'], summary: 'Update lead fields (not stage)', parameters: idParam, responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Leads'], summary: 'Soft delete a lead', parameters: idParam, responses: { 200: { description: 'Deleted' } } }
  },
  [`${leadBase}/{id}/stage`]: {
    patch: {
      tags: ['Pipeline'],
      summary: 'Move a lead along the 7-stage pipeline',
      description: 'NEW -> CONTACTED -> QUALIFIED -> PROPOSAL -> NEGOTIATION -> WON, or LOST at any point. LOST can be revived back to CONTACTED. lostReason is required when stage=LOST.',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['stage'], properties: { stage: { type: 'string' }, lostReason: { type: 'string' } } } } } },
      responses: { 200: { description: 'Stage changed' }, 400: { description: 'Illegal transition' } }
    }
  },
  [`${leadBase}/{id}/followup`]: {
    post: { tags: ['Leads'], summary: 'Log a follow-up and set the next reminder', parameters: idParam, responses: { 200: { description: 'Logged' } } }
  },
  [`${leadBase}/{id}/convert`]: {
    post: {
      tags: ['Pipeline'],
      summary: 'Convert a WON lead into a customer',
      description: 'Only legal from stage WON. Creates the customer, links leadId, reserves the customer code from Master Data.',
      parameters: idParam,
      responses: { 201: { description: 'Converted' }, 400: { description: 'Lead is not WON' }, 409: { description: 'Already converted' } }
    }
  },
  [`${leadBase}/{id}/activities`]: {
    get: { tags: ['Activities'], summary: 'Activity timeline of a lead', parameters: idParam, responses: { 200: { description: 'Activities fetched' } } }
  },

  [`${custBase}/options`]: { get: { tags: ['Customers'], summary: 'Active customers for dropdowns (cached)', responses: { 200: { description: 'Options fetched' } } } },
  [`${custBase}/stats`]: { get: { tags: ['Customers'], summary: 'Counts by status and segment, credit totals', responses: { 200: { description: 'Statistics fetched' } } } },
  [custBase]: {
    get: { tags: ['Customers'], summary: 'List customers', parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/search' }], responses: { 200: { description: 'Customers fetched' } } },
    post: { tags: ['Customers'], summary: 'Create a customer', description: 'GSTIN checksum verified and cross-checked against PAN, same as Supplier Service.', requestBody: { required: true, content: { 'application/json': { schema: customerSchema } } }, responses: { 201: { description: 'Created' }, 409: { description: 'Duplicate GSTIN' } } }
  },
  [`${custBase}/{id}`]: {
    get: { tags: ['Customers'], summary: 'Full customer profile', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Customers'], summary: 'Update a customer', parameters: idParam, responses: { 200: { description: 'Updated' }, 403: { description: 'Blacklisted customers cannot be edited' } } },
    delete: { tags: ['Customers'], summary: 'Soft delete (blocked with outstanding credit balance)', parameters: idParam, responses: { 200: { description: 'Deleted' }, 409: { description: 'Outstanding balance' } } }
  },
  [`${custBase}/{id}/status`]: {
    patch: { tags: ['Customers'], summary: 'Change customer status (blacklist requires a reason)', parameters: idParam, responses: { 200: { description: 'Updated' } } }
  },
  [`${custBase}/{id}/credit/adjust`]: {
    post: {
      tags: ['Credit'],
      summary: 'Adjust the credit meter (row-locked, atomic)',
      description: 'type SALE increases creditUsed; PAYMENT, CREDIT_NOTE, ADJUSTMENT and RELEASE decrease it. Publishes crm.customer.credit_breached when the new balance exceeds the limit.',
      parameters: idParam,
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['type', 'amount'], properties: { type: { type: 'string' }, amount: { type: 'number' }, reference: { type: 'string' } } } } } },
      responses: { 200: { description: 'Adjusted' } }
    }
  },
  [`${custBase}/{id}/credit/check`]: {
    get: {
      tags: ['Credit'],
      summary: 'Check if a proposed sale amount fits inside the credit limit',
      description: 'Intended to be called by the Sales Service before confirming an order.',
      parameters: [...idParam, { in: 'query', name: 'amount', required: true, schema: { type: 'number' } }],
      responses: { 200: { description: 'allowed true/false, with shortfall if false' } }
    }
  },
  [`${custBase}/{id}/addresses`]: { post: { tags: ['Profile'], summary: 'Add an address', parameters: idParam, responses: { 201: { description: 'Added' } } } },
  [`${custBase}/{id}/contacts`]: { post: { tags: ['Profile'], summary: 'Add a contact', parameters: idParam, responses: { 201: { description: 'Added' } } } },
  [`${custBase}/{id}/activities`]: { get: { tags: ['Activities'], summary: 'Activity timeline of a customer', parameters: idParam, responses: { 200: { description: 'Fetched' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Customer CRM Service',
    description: 'Lead pipeline (7 stages), lead-to-customer conversion, customer master with GSTIN/PAN verification, an atomic credit-limit engine, and a shared activity timeline.',
    version: config.version,
    tags: [
      { name: 'Leads', description: 'Lead CRUD' },
      { name: 'Pipeline', description: 'Stage transitions, conversion, summary' },
      { name: 'Customers', description: 'Customer master' },
      { name: 'Credit', description: 'Credit limit adjustment and checks' },
      { name: 'Profile', description: 'Addresses and contacts' },
      { name: 'Activities', description: 'Calls, emails, meetings, notes' }
    ],
    paths,
    components: { schemas: { Lead: leadSchema, Customer: customerSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
