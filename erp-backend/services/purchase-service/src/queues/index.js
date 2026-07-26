'use strict';
const { logger } = require('@erp/shared');
const { purchaseQueue, scheduleRecurringJobs, createPurchaseWorker } = require('./purchase.queue');
const workers = [];
function startWorkers() { workers.push(createPurchaseWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map(w => w.close().catch(() => {})));
  await purchaseQueue.close().catch(() => {});
  logger.info('Purchase queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, purchaseQueue };
