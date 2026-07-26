'use strict';

const { swagger } = require('@erp/shared');
const config = require('../config');

const base = `${config.basePath}/master`;

const partSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    partNumber: { type: 'string', example: 'LM317T' },
    normalizedNumber: { type: 'string', example: 'LM317T', description: 'Uppercased, punctuation stripped' },
    description: { type: 'string', example: 'Adjustable positive voltage regulator 1.5A TO-220' },
    manufacturer: { type: 'object', properties: { id: { type: 'string' }, code: { type: 'string' }, name: { type: 'string' } } },
    category: { type: 'object', properties: { code: { type: 'string' }, path: { type: 'string', example: 'SEMI/ICS/PMIC' } } },
    lifecycle: { type: 'string', enum: ['ACTIVE', 'NRND', 'OBSOLETE', 'END_OF_LIFE', 'PREVIEW'] },
    lifecycleRisk: { type: 'boolean', description: 'True for OBSOLETE and END_OF_LIFE' },
    mountingType: { type: 'string', enum: ['SMD', 'THROUGH_HOLE', 'PANEL', 'MODULE', 'UNKNOWN'] },
    packageType: { type: 'string', example: 'TO-220' },
    rohsCompliant: { type: 'boolean' },
    hsnCode: { type: 'string', example: '85423900' },
    specifications: { type: 'object', example: { voltageOut: '1.25-37V', currentMax: '1.5A', tempRange: '-40..125C' } },
    moq: { type: 'integer' },
    leadTimeDays: { type: 'integer', nullable: true },
    reorderPoint: { type: 'integer' },
    standardCost: { type: 'string', nullable: true },
    alternates: { type: 'array', items: { type: 'object' } }
  }
};

function ok(description) {
  return { 200: { description } };
}

const paths = {
  [`${base}/parts`]: {
    get: {
      tags: ['Parts'],
      summary: 'List parts',
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/search' },
        { in: 'query', name: 'manufacturerId', schema: { type: 'string', format: 'uuid' } },
        { in: 'query', name: 'categoryPath', schema: { type: 'string' }, example: 'SEMI/ICS' },
        { in: 'query', name: 'lifecycle', schema: { type: 'string' } },
        { in: 'query', name: 'rohsCompliant', schema: { type: 'boolean' } }
      ],
      responses: ok('Parts fetched')
    },
    post: {
      tags: ['Parts'],
      summary: 'Create a part',
      description: 'The manufacturer part number is normalised and must be unique per manufacturer.',
      requestBody: { required: true, content: { 'application/json': { schema: partSchema } } },
      responses: { 201: { description: 'Part created' }, 409: { description: 'Duplicate MPN for this manufacturer' } }
    }
  },

  [`${base}/parts/search`]: {
    get: {
      tags: ['Parts'],
      summary: 'Tolerant part number lookup',
      description:
        'Normalises the term ("lm-317 t" -> "LM317T"), strips packaging suffixes such as TR or REEL, then tries exact, prefix and fuzzy matching in that order. matchType tells you which tier answered.',
      parameters: [
        { in: 'query', name: 'q', required: true, schema: { type: 'string' }, example: 'lm-317 t' },
        { in: 'query', name: 'limit', schema: { type: 'integer', maximum: 50 } },
        { in: 'query', name: 'categoryPath', schema: { type: 'string' } }
      ],
      responses: ok('Matches with matchType EXACT | PARTIAL | MIXED | FUZZY | NONE')
    }
  },

  [`${base}/parts/stats`]: {
    get: { tags: ['Parts'], summary: 'Counts by lifecycle and top categories', responses: ok('Statistics fetched') }
  },

  [`${base}/parts/{id}`]: {
    get: { tags: ['Parts'], summary: 'Get a part with alternates', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: ok('Part fetched') },
    put: { tags: ['Parts'], summary: 'Update a part', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: partSchema } } }, responses: ok('Part updated') },
    delete: { tags: ['Parts'], summary: 'Soft delete a part', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: ok('Part deleted') }
  },

  [`${base}/parts/{id}/alternates`]: {
    post: {
      tags: ['Parts'],
      summary: 'Link an alternate part (bidirectional by default)',
      parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['alternateId'],
              properties: {
                alternateId: { type: 'string', format: 'uuid' },
                type: { type: 'string', enum: ['EXACT', 'FUNCTIONAL', 'UPGRADE', 'DOWNGRADE'] },
                notes: { type: 'string' },
                bidirectional: { type: 'boolean', default: true }
              }
            }
          }
        }
      },
      responses: ok('Alternate linked')
    }
  },

  [`${base}/manufacturers`]: {
    get: { tags: ['Manufacturers'], summary: 'List manufacturers', parameters: [{ $ref: '#/components/parameters/page' }, { $ref: '#/components/parameters/search' }], responses: ok('Manufacturers fetched') },
    post: { tags: ['Manufacturers'], summary: 'Create a manufacturer', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/manufacturers/options`]: {
    get: { tags: ['Manufacturers'], summary: 'Active manufacturers for dropdowns (cached)', responses: ok('Options fetched') }
  },

  [`${base}/categories/tree`]: {
    get: {
      tags: ['Categories'],
      summary: 'Full category tree (cached)',
      description: 'Categories carry a materialised path such as SEMI/ICS/MCU, so subtree filters need no recursion.',
      responses: ok('Tree fetched')
    }
  },

  [`${base}/categories`]: {
    get: { tags: ['Categories'], summary: 'List categories', responses: ok('Categories fetched') },
    post: { tags: ['Categories'], summary: 'Create a category (max depth 5)', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/uoms`]: {
    get: { tags: ['Lookups'], summary: 'Units of measure', responses: ok('Units fetched') },
    post: { tags: ['Lookups'], summary: 'Create a unit', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/uoms/convert`]: {
    post: {
      tags: ['Lookups'],
      summary: 'Convert a quantity between units sharing a base',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fromUomId', 'toUomId', 'quantity'],
              properties: { fromUomId: { type: 'string' }, toUomId: { type: 'string' }, quantity: { type: 'number' } }
            }
          }
        }
      },
      responses: ok('Quantity converted')
    }
  },

  [`${base}/currencies`]: {
    get: { tags: ['Lookups'], summary: 'Currencies with stored rates', responses: ok('Currencies fetched') },
    post: { tags: ['Lookups'], summary: 'Create a currency', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/currencies/convert`]: {
    post: {
      tags: ['Lookups'],
      summary: 'Convert an amount, routing through the base currency',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['amount', 'fromCode', 'toCode'],
              properties: { amount: { type: 'number' }, fromCode: { type: 'string', example: 'USD' }, toCode: { type: 'string', example: 'INR' } }
            }
          }
        }
      },
      responses: ok('Amount converted')
    }
  },

  [`${base}/currencies/{id}/rate`]: {
    patch: { tags: ['Lookups'], summary: 'Update an exchange rate', parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }], responses: ok('Rate updated') }
  },

  [`${base}/tax-rates`]: {
    get: { tags: ['Tax'], summary: 'Tax rates effective today', responses: ok('Tax rates fetched') },
    post: { tags: ['Tax'], summary: 'Create a tax rate (CGST/SGST split auto-filled)', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/tax-rates/hsn/{hsnCode}`]: {
    get: { tags: ['Tax'], summary: 'Resolve the active rate for an HSN code', parameters: [{ in: 'path', name: 'hsnCode', required: true, schema: { type: 'string' } }], responses: ok('Rate resolved') }
  },

  [`${base}/tax-rates/compute`]: {
    post: {
      tags: ['Tax'],
      summary: 'Compute the GST breakup for an amount',
      description: 'interState=true returns IGST, otherwise CGST and SGST.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['taxRateId', 'amount'],
              properties: { taxRateId: { type: 'string' }, amount: { type: 'number' }, interState: { type: 'boolean' } }
            }
          }
        }
      },
      responses: ok('Tax computed')
    }
  },

  [`${base}/settings`]: {
    get: { tags: ['Settings'], summary: 'List settings', responses: ok('Settings fetched') },
    post: { tags: ['Settings'], summary: 'Define a setting', responses: { 201: { description: 'Defined' } } }
  },

  [`${base}/settings/public`]: {
    get: { tags: ['Settings'], summary: 'Flat map of public settings for frontend bootstrap', responses: ok('Public settings fetched') }
  },

  [`${base}/settings/{key}`]: {
    put: {
      tags: ['Settings'],
      summary: 'Update a setting value (type coerced, read-only keys rejected)',
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { value: {} } } } } },
      responses: ok('Setting updated')
    }
  },

  [`${base}/sequences`]: {
    get: { tags: ['Numbering'], summary: 'List document number sequences', responses: ok('Sequences fetched') },
    post: { tags: ['Numbering'], summary: 'Create a sequence', responses: { 201: { description: 'Created' } } }
  },

  [`${base}/sequences/{key}/preview`]: {
    get: {
      tags: ['Numbering'],
      summary: 'Preview the next number without consuming it',
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' }, example: 'PURCHASE_ORDER' }],
      responses: ok('Preview returned')
    }
  },

  [`${base}/sequences/{key}/next`]: {
    post: {
      tags: ['Numbering'],
      summary: 'Issue one or more document numbers',
      description:
        'The counter row is locked with SELECT ... FOR UPDATE, so concurrent callers can never receive the same number. Yearly and monthly reset policies are applied automatically.',
      parameters: [{ in: 'path', name: 'key', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: false,
        content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer', default: 1, maximum: 100 } } } } }
      },
      responses: ok('Numbers issued, e.g. ["PO-2026-0142"]')
    }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Master Data Service',
    description:
      'Part master, manufacturers, category tree, units, currencies, GST rates, system settings and atomic document numbering for every downstream module.',
    version: config.version,
    tags: [
      { name: 'Parts', description: 'Part master and alternates' },
      { name: 'Manufacturers', description: 'Component manufacturers' },
      { name: 'Categories', description: 'Hierarchical classification' },
      { name: 'Lookups', description: 'Units and currencies' },
      { name: 'Tax', description: 'GST rates and computation' },
      { name: 'Settings', description: 'System configuration' },
      { name: 'Numbering', description: 'Document number sequences' }
    ],
    paths,
    components: { schemas: { Part: partSchema } }
  });
}

module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
