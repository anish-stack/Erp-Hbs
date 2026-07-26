'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const QuotationService = require('../services/quotation.service');

const salesQueue = new Queue(QUEUE_NAMES.SALES, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});
salesQueue.on('error', (err) => logger.error('Sales queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await salesQueue.add(JOB_NAMES.QUOTATION_EXPIRY_SCAN, {}, { repeat: { pattern: config.crons.quotationExpiry }, jobId: JOB_NAMES.QUOTATION_EXPIRY_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.QUOTATION_EXPIRY_SCAN, config.crons.quotationExpiry);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.QUOTATION_EXPIRY_SCAN, err.message); }
}

async function quotationExpiryScan() {
  const r = await QuotationService.expireDue();
  logger.info('Quotation expiry scan: %d expired', r.expired);
  return r;
}

const handlers = { [JOB_NAMES.QUOTATION_EXPIRY_SCAN]: quotationExpiryScan };

function createSalesWorker() {
  const worker = new Worker(QUEUE_NAMES.SALES, async (job) => {
    const h = handlers[job.name];
    if (!h) throw new Error(`Unknown sales job: ${job.name}`);
    return h(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Sales job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Sales job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Sales worker error: %s', err.message));
  logger.info('Sales worker started');
  return worker;
}

module.exports = { salesQueue, scheduleRecurringJobs, createSalesWorker };
