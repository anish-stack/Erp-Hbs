'use strict';
const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const ShipmentService = require('../services/shipment.service');

const shipmentQueue = new Queue(QUEUE_NAMES.SHIPMENT, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});
shipmentQueue.on('error', (err) => logger.error('Shipment queue error: %s', err.message));

async function scheduleRecurringJobs() {
  try {
    await shipmentQueue.add(JOB_NAMES.STALE_SHIPMENT_SCAN, {}, { repeat: { pattern: config.crons.staleShipment }, jobId: JOB_NAMES.STALE_SHIPMENT_SCAN });
    logger.info('Recurring job scheduled: %s (%s)', JOB_NAMES.STALE_SHIPMENT_SCAN, config.crons.staleShipment);
  } catch (err) { logger.error('Failed to schedule %s: %s', JOB_NAMES.STALE_SHIPMENT_SCAN, err.message); }
}

async function staleShipmentScan() {
  const before = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const r = await ShipmentService.sweepStale(before);
  logger.info('Stale shipment scan: %d open >2d', r.stale);
  return r;
}

const handlers = { [JOB_NAMES.STALE_SHIPMENT_SCAN]: staleShipmentScan };

function createShipmentWorker() {
  const worker = new Worker(QUEUE_NAMES.SHIPMENT, async (job) => {
    const h = handlers[job.name];
    if (!h) throw new Error(`Unknown shipment job: ${job.name}`);
    return h(job);
  }, { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency });
  worker.on('completed', (job) => logger.info('Shipment job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Shipment job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Shipment worker error: %s', err.message));
  logger.info('Shipment worker started');
  return worker;
}

module.exports = { shipmentQueue, scheduleRecurringJobs, createShipmentWorker };
