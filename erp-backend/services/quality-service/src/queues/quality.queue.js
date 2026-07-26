'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const InspectionService = require('../services/inspection.service');

const qualityQueue = new Queue(QUEUE_NAMES.QUALITY, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});
qualityQueue.on('error', (err) => logger.error('Quality queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await qualityQueue.add(JOB_NAMES.STALE_INSPECTION_SCAN, {}, { repeat: { pattern: config.crons.staleInspection }, jobId: JOB_NAMES.STALE_INSPECTION_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.STALE_INSPECTION_SCAN, config.crons.staleInspection);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.STALE_INSPECTION_SCAN, err.message); }
}

async function staleScan() {
  const before = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const r = await InspectionService.sweepStale(before);
  logger.info('Stale inspection scan: %d open >3d', r.stale);
  return r;
}

const handlers = { [JOB_NAMES.STALE_INSPECTION_SCAN]: staleScan };

function createQualityWorker() {
  const worker = new Worker(QUEUE_NAMES.QUALITY, async (job) => {
    const h = handlers[job.name];
    if (!h) throw new Error(`Unknown quality job: ${job.name}`);
    return h(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Quality job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Quality job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Quality worker error: %s', err.message));
  logger.info('Quality worker started');
  return worker;
}

module.exports = { qualityQueue, scheduleRecurringJobs, createQualityWorker };
