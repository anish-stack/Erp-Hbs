'use strict';
const { logger } = require('@erp/shared');
const { qualityQueue, scheduleRecurringJobs, createQualityWorker } = require('./quality.queue');
const workers = [];
function startWorkers() { workers.push(createQualityWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await qualityQueue.close().catch(() => {});
  logger.info('Quality queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, qualityQueue };
