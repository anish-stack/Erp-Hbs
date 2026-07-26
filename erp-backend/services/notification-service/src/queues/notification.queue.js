'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const NotificationService = require('../services/notification.service');

const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 200 },
    removeOnFail: { age: 172800 }
  }
});
notificationQueue.on('error', (err) => logger.error('Notification queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await notificationQueue.add(JOB_NAMES.RETENTION_SCAN, {}, { repeat: { pattern: config.crons.retentionScan }, jobId: JOB_NAMES.RETENTION_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.RETENTION_SCAN, config.crons.retentionScan);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.RETENTION_SCAN, err.message); }
}

async function retentionScan() {
  const r = await NotificationService.purgeOld(config.retentionDays);
  logger.info('Retention scan: purged %d read notification(s) older than %d day(s)', r.purged, config.retentionDays);
  return r;
}

const handlers = { [JOB_NAMES.RETENTION_SCAN]: retentionScan };

function createNotificationWorker() {
  const worker = new Worker(QUEUE_NAMES.NOTIFICATION, async (job) => {
    const h = handlers[job.name];
    if (!h) throw new Error(`Unknown notification job: ${job.name}`);
    return h(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Notification job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Notification job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Notification worker error: %s', err.message));
  logger.info('Notification worker started');
  return worker;
}

module.exports = { notificationQueue, scheduleRecurringJobs, createNotificationWorker };
