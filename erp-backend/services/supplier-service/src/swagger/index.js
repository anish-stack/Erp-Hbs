'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const base = `${config.basePath}/suppliers`;

const supplierSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    code: { type: 'string', example: 'SUP-0042' },
    legalName: { type: 'string', example: 'Bharat Electronics Components Pvt Ltd' },
    type: { type: 'string', enum: ['MANUFACTURER', 'AUTHORISED_DISTRIBUTOR', 'DISTRIBUTOR', 'TRADER', 'BROKER', 'SERVICE_PROVIDER'] },
    status: { type: 'string', enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ON_HOLD', 'BLACKLISTED', 'INACTIVE'] },
    canTransact: { type: 'boolean', description: 'True only while the supplier is APPROVED' },
    gstin: { type: 'string', example: '27AAPFU0939F1ZV' },
    pan: { type: 'string', example: 'AAPFU0939F' },
    taxTreatment: { type: 'string', enum: ['REGISTERED', 'COMPOSITION', 'UNREGISTERED', 'OVERSEAS', 'SEZ'] },
    currencyCode: { type: 'string', example: 'INR' },
    paymentTermDays: { type: 'integer', example: 45 },
    creditLimit: { type: 'string', nullable: true },
    isPreferred: { type: 'boolean' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    overallRating: { type: 'string', nullable: true, example: '82.40' },
    bankAccounts: {
      type: 'array',
      description: 'Account numbers are always returned masked',
      items: { type: 'object', properties: { accountNumber: { type: 'string', example: '********9012' } } }
    }
  }
};

const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const childParams = [
  ...idParam,
  { in: 'path', name: 'childId', required: true, schema: { type: 'string', format: 'uuid' } }
];

function reasonBody(example) {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string', minLength: 5 } } },
        example: { reason: example }
      }
    }
  };
}

const paths = {
  [base]: {
    get: {
      tags: ['Suppliers'],
      summary: 'List suppliers',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'status', schema: { type: 'string' } },
        { in: 'query', name: 'type', schema: { type: 'string' } },
        { in: 'query', name: 'riskLevel', schema: { type: 'string' } },
        { in: 'query', name: 'isPreferred', schema: { type: 'boolean' } }
      ],
      responses: { 200: { description: 'Suppliers fetched' } }
    },
    post: {
      tags: ['Suppliers'],
      summary: 'Create a supplier in DRAFT',
      description:
        'GSTIN is verified with its modulus-36 check digit and cross-checked against the PAN. The supplier code is reserved from the Master Data numbering service unless supplied.',
      requestBody: { required: true, content: { 'application/json': { schema: supplierSchema } } },
      responses: {
        201: { description: 'Supplier created' },
        409: { description: 'Duplicate GSTIN or code' },
        422: { description: 'Compliance validation failed' }
      }
    }
  },

  [`${base}/options`]: {
    get: { tags: ['Suppliers'], summary: 'Approved suppliers for dropdowns (cached)', responses: { 200: { description: 'Options fetched' } } }
  },

  [`${base}/stats`]: {
    get: { tags: ['Suppliers'], summary: 'Counts by status, type and risk level', responses: { 200: { description: 'Statistics fetched' } } }
  },

  [`${base}/leaderboard`]: {
    get: { tags: ['Scorecard'], summary: 'Top rated approved suppliers', responses: { 200: { description: 'Leaderboard fetched' } } }
  },

  [`${base}/prices/compare`]: {
    get: {
      tags: ['Price List'],
      summary: 'Compare every live quote for a part',
      description:
        'Returns each supplier quote valid today at the requested quantity, sorted cheapest first, with the cheapest and fastest suppliers and the price spread. This is the sourcing view used by RFQ and Purchase.',
      parameters: [
        { in: 'query', name: 'partId', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'quantity', schema: { type: 'integer', default: 1 } },
        { in: 'query', name: 'includeUnapproved', schema: { type: 'boolean', default: false } }
      ],
      responses: { 200: { description: 'Quotes compared' } }
    }
  },

  [`${base}/prices`]: {
    get: { tags: ['Price List'], summary: 'Search price entries across suppliers', responses: { 200: { description: 'Prices fetched' } } }
  },

  [`${base}/{id}`]: {
    get: { tags: ['Suppliers'], summary: 'Full supplier profile', parameters: idParam, responses: { 200: { description: 'Supplier fetched' } } },
    put: { tags: ['Suppliers'], summary: 'Update a supplier', parameters: idParam, responses: { 200: { description: 'Updated' }, 403: { description: 'Blacklisted suppliers cannot be edited' } } },
    delete: { tags: ['Suppliers'], summary: 'Soft delete (blocked once approved)', parameters: idParam, responses: { 200: { description: 'Deleted' }, 409: { description: 'Approved supplier' } } }
  },

  [`${base}/{id}/readiness`]: {
    get: {
      tags: ['Workflow'],
      summary: 'Check what is still missing before approval',
      description: 'Verifies address, contact, bank account, GSTIN and the mandatory documents for the tax treatment.',
      parameters: idParam,
      responses: { 200: { description: 'Readiness report with an issues list' } }
    }
  },

  [`${base}/{id}/submit`]: {
    post: {
      tags: ['Workflow'],
      summary: 'Submit for approval (DRAFT -> PENDING_APPROVAL)',
      description: 'Rejected when the readiness check fails.',
      parameters: idParam,
      responses: { 200: { description: 'Submitted' }, 400: { description: 'Not ready or illegal transition' } }
    }
  },

  [`${base}/{id}/approve`]: {
    post: { tags: ['Workflow'], summary: 'Approve (PENDING_APPROVAL -> APPROVED)', parameters: idParam, responses: { 200: { description: 'Approved' } } }
  },

  [`${base}/{id}/reject`]: {
    post: { tags: ['Workflow'], summary: 'Reject with a reason', parameters: idParam, requestBody: reasonBody('GST certificate does not match the legal name'), responses: { 200: { description: 'Rejected' } } }
  },

  [`${base}/{id}/hold`]: {
    post: { tags: ['Workflow'], summary: 'Put an approved supplier on hold', parameters: idParam, requestBody: reasonBody('Repeated late deliveries under review'), responses: { 200: { description: 'On hold' } } }
  },

  [`${base}/{id}/blacklist`]: {
    post: { tags: ['Workflow'], summary: 'Blacklist a supplier', description: 'Clears the preferred flag and forces risk level HIGH.', parameters: idParam, requestBody: reasonBody('Supplied counterfeit components'), responses: { 200: { description: 'Blacklisted' } } }
  },

  [`${base}/{id}/reinstate`]: {
    post: { tags: ['Workflow'], summary: 'Move a blacklisted supplier back to ON_HOLD', parameters: idParam, responses: { 200: { description: 'Reinstated' } } }
  },

  [`${base}/{id}/addresses`]: {
    post: { tags: ['Profile'], summary: 'Add an address', parameters: idParam, responses: { 201: { description: 'Added' } } }
  },
  [`${base}/{id}/contacts`]: {
    post: { tags: ['Profile'], summary: 'Add a contact', parameters: idParam, responses: { 201: { description: 'Added' } } }
  },
  [`${base}/{id}/bank-accounts`]: {
    post: {
      tags: ['Profile'],
      summary: 'Add a bank account',
      description: 'IFSC is format checked. The account number is stored once and only ever returned masked.',
      parameters: idParam,
      responses: { 201: { description: 'Added' } }
    }
  },
  [`${base}/{id}/bank-accounts/{childId}/verify`]: {
    post: { tags: ['Profile'], summary: 'Mark a bank account verified (finance approval)', parameters: childParams, responses: { 200: { description: 'Verified' } } }
  },

  [`${base}/{id}/documents`]: {
    post: {
      tags: ['Documents'],
      summary: 'Attach a compliance document',
      description: 'The file itself lives in the File Service; this records the type, number and expiry.',
      parameters: idParam,
      responses: { 201: { description: 'Attached' } }
    }
  },
  [`${base}/{id}/documents/{childId}/verify`]: {
    post: { tags: ['Documents'], summary: 'Verify a document', parameters: childParams, responses: { 200: { description: 'Verified' } } }
  },

  [`${base}/{id}/prices`]: {
    post: { tags: ['Price List'], summary: 'Add a quoted price for a part', parameters: idParam, responses: { 201: { description: 'Added' }, 400: { description: 'Part not found in master data' } } }
  },

  [`${base}/{id}/prices/bulk`]: {
    put: {
      tags: ['Price List'],
      summary: 'Replace the whole price list in one transaction',
      description: 'Every part id is verified against the Master Data Service before anything is written.',
      parameters: idParam,
      responses: { 200: { description: 'Price list replaced' }, 400: { description: 'Unknown part ids' } }
    }
  },

  [`${base}/{id}/ratings`]: {
    get: {
      tags: ['Scorecard'],
      summary: 'Rating history and live performance counters',
      parameters: idParam,
      responses: { 200: { description: 'History fetched' } }
    },
    post: {
      tags: ['Scorecard'],
      summary: 'Evaluate a supplier for a period',
      description:
        'Delivery, quality and responsiveness default to the counters accumulated from purchase and quality events. The weighted overall score updates the supplier grade and risk level.',
      parameters: idParam,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['periodStart', 'periodEnd'],
              properties: {
                periodStart: { type: 'string', format: 'date' },
                periodEnd: { type: 'string', format: 'date' },
                priceScore: { type: 'number', minimum: 0, maximum: 100 },
                complianceScore: { type: 'number', minimum: 0, maximum: 100 },
                remarks: { type: 'string' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Supplier scored' } }
    }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Supplier Service',
    description:
      'Vendor master with a guarded approval workflow, GSTIN and PAN verification, masked bank details, compliance document expiry tracking, multi-tier price lists and an event-driven scorecard.',
    version: config.version,
    tags: [
      { name: 'Suppliers', description: 'Vendor master' },
      { name: 'Workflow', description: 'Draft, approval, hold and blacklist' },
      { name: 'Profile', description: 'Addresses, contacts and bank accounts' },
      { name: 'Documents', description: 'Compliance documents and expiry' },
      { name: 'Price List', description: 'Quoted prices and sourcing comparison' },
      { name: 'Scorecard', description: 'Vendor performance ratings' }
    ],
    paths,
    components: { schemas: { Supplier: supplierSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
