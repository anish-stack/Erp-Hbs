'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');

const poBase = `${config.basePath}/purchase`;
const grnBase = `${config.basePath}/grn`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const poIdParam = [{ in: 'path', name: 'poId', required: true, schema: { type: 'string', format: 'uuid' } }];

const poSchema = { type: 'object', properties: {
  id: { type: 'string' }, code: { type: 'string', example: 'PO-2026-0142' },
  status: { type: 'string', enum: ['DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','ISSUED','PARTIALLY_RECEIVED','RECEIVED','CLOSED','CANCELLED'] },
  grandTotal: { type: 'string' }, approvalRequired: { type: 'boolean' }
}};

const paths = {
  [poBase]: {
    get: { tags: ['Purchase Orders'], summary: 'List POs', parameters: [{ $ref: '#/components/parameters/page' }, { in: 'query', name: 'status', schema: { type: 'string' } }], responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Purchase Orders'], summary: 'Create a PO', description: 'Verifies parts (Master) and supplier (must be APPROVED). Computes line/tax totals. Sets approvalRequired when total >= PO_APPROVAL_THRESHOLD.', requestBody: { required: true, content: { 'application/json': { schema: poSchema } } }, responses: { 201: { description: 'Created' } } }
  },
  [`${poBase}/stats`]: { get: { tags: ['Purchase Orders'], summary: 'Counts and value by status', responses: { 200: { description: 'Fetched' } } } },
  [`${poBase}/{id}`]: {
    get: { tags: ['Purchase Orders'], summary: 'Get a PO with lines and GRNs', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Purchase Orders'], summary: 'Update PO header (DRAFT only)', parameters: idParam, responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Purchase Orders'], summary: 'Delete a PO (DRAFT only)', parameters: idParam, responses: { 200: { description: 'Deleted' } } }
  },
  [`${poBase}/{id}/submit`]: { post: { tags: ['Workflow'], summary: 'Submit for approval, or auto-issue if below the threshold', parameters: idParam, responses: { 200: { description: 'Submitted or issued' } } } },
  [`${poBase}/{id}/approve`]: { post: { tags: ['Workflow'], summary: 'Approve a PO', parameters: idParam, responses: { 200: { description: 'Approved' } } } },
  [`${poBase}/{id}/reject`]: { post: { tags: ['Workflow'], summary: 'Reject with a reason', parameters: idParam, responses: { 200: { description: 'Rejected' } } } },
  [`${poBase}/{id}/issue`]: { post: { tags: ['Workflow'], summary: 'Issue an approved PO to the supplier', parameters: idParam, responses: { 200: { description: 'Issued' } } } },
  [`${poBase}/{id}/cancel`]: { post: { tags: ['Workflow'], summary: 'Cancel a PO', parameters: idParam, responses: { 200: { description: 'Cancelled' } } } },
  [`${poBase}/{id}/close`]: { post: { tags: ['Workflow'], summary: 'Close a fully received PO', parameters: idParam, responses: { 200: { description: 'Closed' } } } },

  [`${poBase}/{poId}/grns`]: {
    get: { tags: ['GRN'], summary: 'List GRNs for a PO', parameters: poIdParam, responses: { 200: { description: 'Fetched' } } },
    post: {
      tags: ['GRN'],
      summary: 'Record goods receipt against a PO',
      description: `Rejects receipt beyond GRN_TOLERANCE_PERCENT over the ordered quantity. Auto-advances PO to PARTIALLY_RECEIVED or RECEIVED. Publishes quality.inspection.requested when inspectionRequired is true.`,
      parameters: poIdParam,
      responses: { 201: { description: 'Recorded' }, 400: { description: 'Tolerance exceeded or PO not receivable' } }
    }
  },
  [`${grnBase}/{id}`]: { get: { tags: ['GRN'], summary: 'Get a GRN', parameters: idParam, responses: { 200: { description: 'Fetched' } } } },
  [`${grnBase}/{id}/inspection-result`]: {
    post: {
      tags: ['GRN'],
      summary: 'Record inspection accept/reject quantities',
      description: 'Intended to be called by the Quality Service once inspection completes. accepted + rejected must equal received per line.',
      parameters: idParam,
      responses: { 200: { description: 'Recorded' }, 400: { description: 'Quantities do not reconcile' } }
    }
  }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Purchase & GRN Service',
    description: 'Purchase orders with a value-based approval gate, goods receipt with over-receipt tolerance control, and the inspection handoff to Quality.',
    version: config.version,
    tags: [
      { name: 'Purchase Orders', description: 'PO CRUD' },
      { name: 'Workflow', description: 'Submit, approve, issue, cancel, close' },
      { name: 'GRN', description: 'Goods receipt and inspection results' }
    ],
    paths, components: { schemas: { PurchaseOrder: poSchema } }
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
