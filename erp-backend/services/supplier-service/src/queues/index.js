'use strict';

const { logger } = require('@erp/shared');
const { supplierQueue, scheduleRecurringJobs, createSupplierWorker } = require('./supplier.queue');

const workers = [];

function startWorkers() {
  workers.push(createSupplierWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await supplierQueue.close().catch(() => {});
  logger.info('Supplier queue and workers closed');
}

module.exports = { startWorkers, closeAll, scheduleRecurringJobs, supplierQueue };
