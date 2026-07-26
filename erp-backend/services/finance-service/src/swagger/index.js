'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/finance`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${base}/stats`]: { get: { tags: ['Reports'], summary: 'Receivable / payable outstanding + status counts', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/payments/stats`]: { get: { tags: ['Reports'], summary: 'Total inbound / outbound settled', responses: { 200: { description: 'Fetched' } } } },

  [`${base}/invoices`]: {
    get: { tags: ['Invoices'], summary: 'List invoices (filter type/status/party/overdue)', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Invoices'], summary: 'Create an invoice (SALES / PURCHASE) with GST', description: 'Tax split: intra-state supply -> CGST+SGST, inter-state (placeOfSupply != seller state) -> IGST. Totals rounded to the rupee with roundOff captured.', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/invoices/from-sales-order`]: { post: { tags: ['Invoices'], summary: 'Draft an AR invoice from a sales order (idempotent)', responses: { 201: { description: 'Drafted' } } } },
  [`${base}/invoices/from-purchase-order`]: { post: { tags: ['Invoices'], summary: 'Draft an AP bill from a purchase order (idempotent)', responses: { 201: { description: 'Drafted' } } } },
  [`${base}/invoices/{id}`]: { get: { tags: ['Invoices'], summary: 'Invoice detail with GST lines', parameters: idParam, responses: { 200: { description: 'Fetched' } } } },
  [`${base}/invoices/{id}/issue`]: { post: { tags: ['Invoices'], summary: 'Issue (DRAFT -> ISSUED), sets due date', parameters: idParam, responses: { 200: { description: 'Issued' } } } },
  [`${base}/invoices/{id}/cancel`]: { post: { tags: ['Invoices'], summary: 'Cancel (blocked once payments allocated)', parameters: idParam, responses: { 200: { description: 'Cancelled' } } } },

  [`${base}/payments`]: {
    get: { tags: ['Payments'], summary: 'List payments', responses: { 200: { description: 'Fetched' } } },
    post: {
      tags: ['Payments'],
      summary: 'Record a payment and allocate across invoices',
      description: 'Direction is inferred from party type (customer -> INBOUND, supplier -> OUTBOUND). Allocations atomically update each invoice amountPaid / amountDue / status; over-allocation is rejected.',
      responses: { 201: { description: 'Recorded' } }
    }
  },
  [`${base}/payments/{id}`]: { get: { tags: ['Payments'], summary: 'Payment detail with allocations', parameters: idParam, responses: { 200: { description: 'Fetched' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Finance Service',
    description: 'Accounts receivable and payable: GST invoices (CGST/SGST/IGST) drafted from sales orders and purchase orders, and payments allocated across invoices with automatic status roll-up. Overdue invoices are flagged nightly.',
    version: config.version,
    tags: [
      { name: 'Invoices', description: 'Customer and vendor invoices with GST' },
      { name: 'Payments', description: 'Payments and allocations' },
      { name: 'Reports', description: 'Outstanding and settlement totals' }
    ],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
