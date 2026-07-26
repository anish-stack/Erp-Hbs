'use strict';

const { logger } = require('@erp/shared');
const { rfqQueue, scheduleRecurringJobs, createRfqWorker } = require('./rfq.queue');

const workers = [];
function startWorkers() { workers.push(createRfqWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await rfqQueue.close().catch(() => {});
  logger.info('RFQ queue and workers closed');
}

module.exports = { startWorkers, closeAll, scheduleRecurringJobs, rfqQueue };
