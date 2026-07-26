'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const TaskService = require('../services/task.service');

const warehouseQueue = new Queue(QUEUE_NAMES.WAREHOUSE, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

warehouseQueue.on('error', (err) => logger.error('Warehouse queue error: %s', err.message));

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.STALE_TASK_SCAN, cron: config.crons.staleTask },
    { name: JOB_NAMES.BIN_OCCUPANCY_SYNC, cron: config.crons.binOccupancy }
  ];
  for (const schedule of schedules) {
    try {
      await warehouseQueue.add(schedule.name, {}, { repeat: { pattern: schedule.cron }, jobId: schedule.name });
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

async function staleTaskScan() {
  const before = new Date(Date.now() - 24 * 3600 * 1000);
  const result = await TaskService.sweepStale(before);
  logger.info('Stale task scan found %d open task(s) older than 24h', result.stale);
  return result;
}

const handlers = {
  [JOB_NAMES.STALE_TASK_SCAN]: staleTaskScan,
  [JOB_NAMES.BIN_OCCUPANCY_SYNC]: async () => ({ synced: true })
};

function createWarehouseWorker() {
  const worker = new Worker(
    QUEUE_NAMES.WAREHOUSE,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown warehouse job: ${job.name}`);
      return handler(job);
    },
    { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency }
  );

  worker.on('completed', (job) => logger.info('Warehouse job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Warehouse job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Warehouse worker error: %s', err.message));

  logger.info('Warehouse worker started');
  return worker;
}

module.exports = { warehouseQueue, scheduleRecurringJobs, createWarehouseWorker, staleTaskScan };
