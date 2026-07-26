'use strict';
const { logger } = require('@erp/shared');
const { financeQueue, scheduleRecurringJobs, createFinanceWorker } = require('./finance.queue');
const workers = [];
function startWorkers() { workers.push(createFinanceWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await financeQueue.close().catch(() => {});
  logger.info('Finance queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, financeQueue };
