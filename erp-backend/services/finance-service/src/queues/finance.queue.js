'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const InvoiceService = require('../services/invoice.service');

const financeQueue = new Queue(QUEUE_NAMES.FINANCE, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});
financeQueue.on('error', (err) => logger.error('Finance queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await financeQueue.add(JOB_NAMES.OVERDUE_SCAN, {}, { repeat: { pattern: config.crons.overdueScan }, jobId: JOB_NAMES.OVERDUE_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.OVERDUE_SCAN, config.crons.overdueScan);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.OVERDUE_SCAN, err.message); }
}

async function overdueScan() {
  const r = await InvoiceService.markOverdue(new Date());
  logger.info('Overdue scan: %d invoice(s) flagged overdue', r.overdue);
  return r;
}

const handlers = { [JOB_NAMES.OVERDUE_SCAN]: overdueScan };

function createFinanceWorker() {
  const worker = new Worker(QUEUE_NAMES.FINANCE, async (job) => {
    const h = handlers[job.name];
    if (!h) throw new Error(`Unknown finance job: ${job.name}`);
    return h(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Finance job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Finance job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Finance worker error: %s', err.message));
  logger.info('Finance worker started');
  return worker;
}

module.exports = { financeQueue, scheduleRecurringJobs, createFinanceWorker };
