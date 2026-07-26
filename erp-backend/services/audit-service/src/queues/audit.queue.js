'use strict';

const { Queue } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');

const auditQueue = new Queue(QUEUE_NAMES.AUDIT, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

auditQueue.on('error', (err) => logger.error('Audit queue error: %s', err.message));

async function enqueue(jobName, payload, options = {}) {
  const job = await auditQueue.add(jobName, payload, options);
  logger.info('Audit job queued [%s] id=%s', jobName, job.id);
  return job.id;
}

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.ROLLUP_DAILY, cron: config.retention.rollupCron },
    { name: JOB_NAMES.PURGE_RETENTION, cron: config.retention.purgeCron },
    { name: JOB_NAMES.PURGE_EXPORTS, cron: '20 * * * *' }
  ];

  for (const schedule of schedules) {
    try {
      await auditQueue.add(
        schedule.name,
        {},
        { repeat: { pattern: schedule.cron }, jobId: schedule.name }
      );
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

module.exports = { auditQueue, enqueue, scheduleRecurringJobs };
