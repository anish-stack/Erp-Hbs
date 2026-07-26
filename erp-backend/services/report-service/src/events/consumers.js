'use strict';
const { logger } = require('@erp/shared');

/**
 * Report generation is user-requested (via POST /reports/runs), not event
 * driven, so there is nothing to subscribe to here. Kept as a no-op to match
 * the standard service bootstrap contract (server.js calls registerConsumers
 * unconditionally).
 */
async function registerConsumers() {
  logger.info('Report service has no event consumers (generation is on-demand)');
}

module.exports = { registerConsumers };
