'use strict';

const { logger } = require('@erp/shared');
const { crmQueue, scheduleRecurringJobs, createCrmWorker } = require('./crm.queue');

const workers = [];
function startWorkers() { workers.push(createCrmWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await crmQueue.close().catch(() => {});
  logger.info('CRM queue and workers closed');
}

module.exports = { startWorkers, closeAll, scheduleRecurringJobs, crmQueue };
