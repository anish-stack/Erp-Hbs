'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const RfqService = require('../services/rfq.service');

const rfqQueue = new Queue(QUEUE_NAMES.RFQ, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

rfqQueue.on('error', (err) => logger.error('RFQ queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await rfqQueue.add(JOB_NAMES.DEADLINE_SCAN, {}, { repeat: { pattern: config.deadlineScanCron }, jobId: JOB_NAMES.DEADLINE_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.DEADLINE_SCAN, config.deadlineScanCron);
  } catch (err) {
    logger.error('Failed to schedule %s: %s', JOB_NAMES.DEADLINE_SCAN, err.message);
  }
}

const handlers = { [JOB_NAMES.DEADLINE_SCAN]: () => RfqService.scanDeadlines() };

function createRfqWorker() {
  const worker = new Worker(
    QUEUE_NAMES.RFQ,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown RFQ job: ${job.name}`);
      return handler(job);
    },
    { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency }
  );
  worker.on('completed', (job) => logger.info('RFQ job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('RFQ job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('RFQ worker error: %s', err.message));
  logger.info('RFQ worker started');
  return worker;
}

module.exports = { rfqQueue, scheduleRecurringJobs, createRfqWorker };
