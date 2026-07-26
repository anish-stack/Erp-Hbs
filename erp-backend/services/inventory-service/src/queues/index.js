'use strict';

const { logger } = require('@erp/shared');
const { inventoryQueue, scheduleRecurringJobs, createInventoryWorker } = require('./inventory.queue');

const workers = [];

function startWorkers() {
  workers.push(createInventoryWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await inventoryQueue.close().catch(() => {});
  logger.info('Inventory queue and workers closed');
}

module.exports = { startWorkers, closeAll, scheduleRecurringJobs, inventoryQueue };
