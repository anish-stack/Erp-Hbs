'use strict';

const { logger } = require('@erp/shared');
const { bulkQueue, enqueue, scheduleRecurringJobs } = require('./bulk.queue');
const { createBulkWorker } = require('./bulk.worker');

const workers = [];

function startWorkers() {
  workers.push(createBulkWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await bulkQueue.close().catch(() => {});
  logger.info('Bulk queue and workers closed');
}

module.exports = { startWorkers, closeAll, enqueue, scheduleRecurringJobs, bulkQueue };
