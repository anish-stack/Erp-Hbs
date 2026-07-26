'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const PoService = require('../services/po.service');

const purchaseQueue = new Queue(QUEUE_NAMES.PURCHASE, {
  connection: bullConnection(), prefix: config.queue.prefix,
  defaultJobOptions: { attempts: config.queue.attempts, backoff: { type: 'exponential', delay: config.queue.backoffMs }, removeOnComplete: { age: 86400, count: 100 }, removeOnFail: { age: 172800 } }
});
purchaseQueue.on('error', (err) => logger.error('Purchase queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await purchaseQueue.add(JOB_NAMES.OVERDUE_SCAN, {}, { repeat: { pattern: '0 9 * * *' }, jobId: JOB_NAMES.OVERDUE_SCAN });
    logger.info('Recurring job scheduled: %s', JOB_NAMES.OVERDUE_SCAN);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.OVERDUE_SCAN, err.message); }
}

const handlers = { [JOB_NAMES.OVERDUE_SCAN]: () => PoService.scanOverdue() };

function createPurchaseWorker() {
  const worker = new Worker(QUEUE_NAMES.PURCHASE, async (job) => {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`Unknown purchase job: ${job.name}`);
    return handler(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Purchase job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Purchase job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Purchase worker error: %s', err.message));
  logger.info('Purchase worker started');
  return worker;
}
module.exports = { purchaseQueue, scheduleRecurringJobs, createPurchaseWorker };
