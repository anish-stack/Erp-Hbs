'use strict';

const { Queue } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');

const fileQueue = new Queue(QUEUE_NAMES.FILE, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 172800 }
  }
});

fileQueue.on('error', (err) => logger.error('File queue error: %s', err.message));

async function enqueue(jobName, payload, options = {}) {
  try {
    const job = await fileQueue.add(jobName, payload, options);
    logger.info('File job queued [%s] id=%s', jobName, job.id);
    return job.id;
  } catch (err) {
    logger.error('Failed to queue [%s]: %s', jobName, err.message);
    return null;
  }
}

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.PURGE_OBJECTS, cron: '*/10 * * * *' },
    { name: JOB_NAMES.CLEAN_ORPHANS, cron: '0 3 * * *' }
  ];

  for (const schedule of schedules) {
    try {
      await fileQueue.add(schedule.name, {}, { repeat: { pattern: schedule.cron }, jobId: schedule.name });
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

module.exports = {
  fileQueue,
  enqueue,
  scheduleRecurringJobs,
  enqueueImageProcessing: (payload) => enqueue(JOB_NAMES.PROCESS_IMAGE, payload, { priority: 2 })
};
