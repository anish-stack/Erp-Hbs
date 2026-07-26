'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');

const reportQueue = new Queue(QUEUE_NAMES.REPORT, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 200 },
    removeOnFail: { age: 172800 }
  }
});
reportQueue.on('error', (err) => logger.error('Report queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await reportQueue.add(JOB_NAMES.RETENTION_SCAN, {}, { repeat: { pattern: config.crons.retentionScan }, jobId: JOB_NAMES.RETENTION_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.RETENTION_SCAN, config.crons.retentionScan);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.RETENTION_SCAN, err.message); }
}

async function retentionScan() {
  // Lazy require: ReportRunService pulls in this queue module (to enqueue new
  // runs), so this stays a function-body require to dodge the circular load.
  const ReportRunService = require('../services/reportRun.service');
  const r = await ReportRunService.purgeOld(config.retentionDays);
  logger.info('Report retention scan: purged %d run(s) older than %d day(s)', r.purged, config.retentionDays);
  return r;
}

function createReportWorker() {
  const worker = new Worker(QUEUE_NAMES.REPORT, async (job) => {
    if (job.name === JOB_NAMES.RETENTION_SCAN) return retentionScan();
    if (job.name === 'generate-report') {
      const generator = require('../services/reportGenerator.service');
      return generator.run(job.data.runId, job.data.user);
    }
    throw new Error(`Unknown report job: ${job.name}`);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });

  worker.on('completed', (job) => logger.info('Report job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Report job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Report worker error: %s', err.message));
  logger.info('Report worker started');
  return worker;
}

module.exports = { reportQueue, scheduleRecurringJobs, createReportWorker };
