'use strict';

const { Queue } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');

const bulkQueue = new Queue(QUEUE_NAMES.BULK, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 200 },
    removeOnFail: { age: 172800 }
  }
});

bulkQueue.on('error', (err) => logger.error('Bulk queue error: %s', err.message));

async function enqueue(jobName, payload, options = {}) {
  const job = await bulkQueue.add(jobName, payload, options);
  logger.info('Bulk job queued [%s] id=%s', jobName, job.id);
  return job.id;
}

async function scheduleRecurringJobs() {
  try {
    await bulkQueue.add(
      JOB_NAMES.PURGE_EXPORTS,
      {},
      { repeat: { pattern: '30 * * * *' }, jobId: JOB_NAMES.PURGE_EXPORTS }
    );
    logger.info('Recurring job scheduled: %s (hourly)', JOB_NAMES.PURGE_EXPORTS);
  } catch (err) {
    logger.error('Failed to schedule export purge: %s', err.message);
  }
}

module.exports = { bulkQueue, enqueue, scheduleRecurringJobs };
