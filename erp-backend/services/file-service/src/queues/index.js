'use strict';

const { logger } = require('@erp/shared');
const { fileQueue, enqueue, scheduleRecurringJobs } = require('./file.queue');
const { createFileWorker } = require('./file.worker');

const workers = [];

function startWorkers() {
  workers.push(createFileWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await fileQueue.close().catch(() => {});
  logger.info('File queue and workers closed');
}

module.exports = { startWorkers, closeAll, enqueue, scheduleRecurringJobs, fileQueue };
