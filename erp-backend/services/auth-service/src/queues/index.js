'use strict';

const { logger } = require('@erp/shared');
const { emailQueue } = require('./email.queue');
const { createEmailWorker } = require('./email.worker');
const {
  cleanupQueue,
  scheduleRecurringJobs,
  createSessionCleanupWorker
} = require('./sessionCleanup.queue');

const started = [];

function startWorkers() {
  const email = createEmailWorker();
  const cleanup = createSessionCleanupWorker();
  started.push(email.worker, email.events, cleanup);
  return started;
}

async function closeAll() {
  await Promise.all(started.map((item) => item.close().catch(() => {})));
  await emailQueue.close().catch(() => {});
  await cleanupQueue.close().catch(() => {});
  logger.info('Queues and workers closed');
}

module.exports = { startWorkers, scheduleRecurringJobs, closeAll, emailQueue, cleanupQueue };
