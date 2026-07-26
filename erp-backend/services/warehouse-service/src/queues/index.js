'use strict';

const { logger } = require('@erp/shared');
const { warehouseQueue, scheduleRecurringJobs, createWarehouseWorker } = require('./warehouse.queue');

const workers = [];

function startWorkers() {
  workers.push(createWarehouseWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await warehouseQueue.close().catch(() => {});
  logger.info('Warehouse queue and workers closed');
}

module.exports = { startWorkers, closeAll, scheduleRecurringJobs, warehouseQueue };
