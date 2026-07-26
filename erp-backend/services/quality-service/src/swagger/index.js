'use strict';
const { swagger } = require('@erp/shared');
const config = require('../config');
const base = `${config.basePath}/quality`;
const idParam = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];

const paths = {
  [`${base}/plans`]: {
    get: { tags: ['Plans'], summary: 'List inspection plans', responses: { 200: { description: 'Fetched' } } },
    post: { tags: ['Plans'], summary: 'Create an inspection plan (checkpoints + sampling)', responses: { 201: { description: 'Created' } } }
  },
  [`${base}/plans/{id}`]: {
    get: { tags: ['Plans'], summary: 'Plan detail', parameters: idParam, responses: { 200: { description: 'Fetched' } } },
    put: { tags: ['Plans'], summary: 'Update plan', parameters: idParam, responses: { 200: { description: 'Updated' } } },
    delete: { tags: ['Plans'], summary: 'Delete plan', parameters: idParam, responses: { 200: { description: 'Deleted' } } }
  },
  [`${base}/stats`]: { get: { tags: ['Inspections'], summary: 'Counts + accept/reject quantities + rejection rate', responses: { 200: { description: 'Fetched' } } } },
  [`${base}/inspections`]: {
    get: { tags: ['Inspections'], summary: 'List inspections (filter status/type/part/supplier/grn/pending)', responses: { 200: { description: 'Fetched' } } },
    post: {
      tags: ['Inspections'],
      summary: 'Create an incoming inspection',
      description: 'Called by the GRN/receiving flow with part + quantity + warehouse. Matches an active plan for the part/category if none is given. Unique per (GRN, part).',
      responses: { 201: { description: 'Created' }, 409: { description: 'Duplicate for GRN+part' } }
    }
  },
  [`${base}/inspections/{id}`]: { get: { tags: ['Inspections'], summary: 'Inspection detail with results', parameters: idParam, responses: { 200: { description: 'Fetched' } } } },
  [`${base}/inspections/{id}/start`]: { post: { tags: ['Inspections'], summary: 'Start (PENDING -> IN_PROGRESS)', parameters: idParam, responses: { 200: { description: 'Started' } } } },
  [`${base}/inspections/{id}/results`]: { post: { tags: ['Inspections'], summary: 'Record checkpoint results (replaces existing)', parameters: idParam, responses: { 200: { description: 'Recorded' } } } },
  [`${base}/inspections/{id}/complete`]: {
    post: {
      tags: ['Inspections'],
      summary: 'Complete with accepted / rejected split + disposition',
      description: 'Accepted quantity is posted to Inventory as available stock (disposition ACCEPT/USE_AS_IS). Emits quality.inspection.passed / failed / partial for the supplier scorecard.',
      parameters: idParam,
      responses: { 200: { description: 'Completed' }, 503: { description: 'Inventory receipt failed' } }
    }
  },
  [`${base}/inspections/{id}/hold`]: { post: { tags: ['Inspections'], summary: 'Put on hold', parameters: idParam, responses: { 200: { description: 'On hold' } } } },
  [`${base}/inspections/{id}/cancel`]: { post: { tags: ['Inspections'], summary: 'Cancel', parameters: idParam, responses: { 200: { description: 'Cancelled' } } } }
};

function buildDocument() {
  return swagger.buildBaseDocument({
    title: 'ERP Quality Inspection Service',
    description: 'Incoming quality inspection for received goods: plans with checkpoints and sampling, accept/reject disposition, automatic posting of accepted stock into Inventory, and pass/fail events feeding the supplier scorecard.',
    version: config.version,
    tags: [
      { name: 'Plans', description: 'Inspection plans and checkpoints' },
      { name: 'Inspections', description: 'Inspection lifecycle and disposition' }
    ],
    paths,
    components: {}
  });
}
module.exports = { buildDocument, swaggerUiOptions: swagger.swaggerUiOptions };
