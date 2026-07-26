'use strict';
const { logger } = require('@erp/shared');
const { notificationQueue, scheduleRecurringJobs, createNotificationWorker } = require('./notification.queue');
const workers = [];
function startWorkers() { workers.push(createNotificationWorker()); return workers; }
async function closeAll() {
  await Promise.all(workers.map((w) => w.close().catch(() => {})));
  await notificationQueue.close().catch(() => {});
  logger.info('Notification queue and workers closed');
}
module.exports = { startWorkers, closeAll, scheduleRecurringJobs, notificationQueue };
