'use strict';
const { logger } = require('@erp/shared');
const { salesQueue, scheduleRecurringJobs, createSalesWorker } = require('./sales.queue');
const workers = [];
function startWorkers() { workers.push(createSalesWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await salesQueue.close().catch(() => {});
  logger.info('Sales queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, salesQueue };
