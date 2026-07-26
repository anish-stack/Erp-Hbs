'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const LeadService = require('../services/lead.service');

const crmQueue = new Queue(QUEUE_NAMES.CRM, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

crmQueue.on('error', (err) => logger.error('CRM queue error: %s', err.message));

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.FOLLOWUP_SCAN, cron: config.lead.followUpCron },
    { name: JOB_NAMES.STALE_LEAD_SCAN, cron: '30 8 * * *' }
  ];
  for (const schedule of schedules) {
    try {
      await crmQueue.add(schedule.name, {}, { repeat: { pattern: schedule.cron }, jobId: schedule.name });
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

const handlers = {
  [JOB_NAMES.FOLLOWUP_SCAN]: () => LeadService.scanFollowUps(),
  [JOB_NAMES.STALE_LEAD_SCAN]: () => LeadService.scanStale(config.lead.staleDays)
};

function createCrmWorker() {
  const worker = new Worker(
    QUEUE_NAMES.CRM,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown CRM job: ${job.name}`);
      return handler(job);
    },
    { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency }
  );

  worker.on('completed', (job) => logger.info('CRM job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('CRM job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('CRM worker error: %s', err.message));

  logger.info('CRM worker started');
  return worker;
}

module.exports = { crmQueue, scheduleRecurringJobs, createCrmWorker };
