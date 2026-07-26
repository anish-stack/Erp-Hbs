'use strict';
const { logger } = require('@erp/shared');
const { reportQueue, scheduleRecurringJobs, createReportWorker } = require('./report.queue');
const workers = [];
function startWorkers() { workers.push(createReportWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await reportQueue.close().catch(() => {});
  logger.info('Report queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, reportQueue };
