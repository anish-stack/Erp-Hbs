'use strict';

const { logger } = require('@erp/shared');
const { auditQueue, enqueue, scheduleRecurringJobs } = require('./audit.queue');
const { createAuditWorker } = require('./audit.worker');

const workers = [];

function startWorkers() {
  workers.push(createAuditWorker());
  return workers;
}

async function closeAll() {
  await Promise.all(workers.map((worker) => worker.close().catch(() => {})));
  await auditQueue.close().catch(() => {});
  logger.info('Audit queue and workers closed');
}

module.exports = { startWorkers, closeAll, enqueue, scheduleRecurringJobs, auditQueue };
