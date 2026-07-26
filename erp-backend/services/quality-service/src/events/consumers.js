'use strict';
const { broker, logger } = require('@erp/shared');

const QUEUE = 'quality-service.events';

/**
 * Purchase emits quality.inspection.requested when a GRN needs inspection, but
 * the event carries no part/quantity detail, so we do not fabricate an
 * inspection from it. The receiving flow calls POST /quality/inspections with
 * full line data. Here we only log the signal for traceability.
 */
async function handle(event) {
  const data = event.data || {};
  if (event.event === 'quality.inspection.requested') {
    logger.info('Inspection requested for GRN %s (create via API with line data)', data.grnId || data.code || '-');
  }
}

async function registerConsumers() {
  await broker.subscribe(QUEUE, ['quality.inspection.requested'], handle);
  logger.info('Quality consumers registered on queue %s', QUEUE);
}

module.exports = { registerConsumers, QUEUE, handle };
