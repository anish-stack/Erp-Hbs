'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const StockService = require('../services/stock.service');
const ReservationService = require('../services/reservation.service');
const LotRepository = require('../repositories/lot.repository');
const publisher = require('../events/publisher');

const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

inventoryQueue.on('error', (err) => logger.error('Inventory queue error: %s', err.message));

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.LOW_STOCK_SCAN, cron: config.crons.lowStock },
    { name: JOB_NAMES.RESERVATION_SWEEP, cron: config.crons.reservationSweep },
    { name: JOB_NAMES.LOT_EXPIRY_SCAN, cron: config.crons.lotExpiry }
  ];
  for (const schedule of schedules) {
    try {
      await inventoryQueue.add(schedule.name, {}, { repeat: { pattern: schedule.cron }, jobId: schedule.name });
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

async function lowStockScan() {
  const rows = await StockService.lowStock();
  for (const row of rows) {
    await publisher.lowStock(
      { id: row.id, partId: row.partId, partCode: row.partCode, warehouseId: row.warehouseId, onHand: row.available, available: row.available, reorderPoint: row.reorderPoint, reorderQty: row.reorderQty },
      Number(row.available) <= 0 ? 'CRITICAL' : 'WARNING'
    );
  }
  logger.info('Low-stock scan flagged %d position(s)', rows.length);
  return { flagged: rows.length };
}

async function lotExpiryScan() {
  const soon = new Date(Date.now() + 30 * 86400 * 1000);
  const lots = await LotRepository.expiringBefore(soon);
  if (lots.length) await publisher.lotExpiring(lots);
  logger.info('Lot expiry scan found %d lot(s) expiring within 30 days', lots.length);
  return { expiring: lots.length };
}

const handlers = {
  [JOB_NAMES.LOW_STOCK_SCAN]: lowStockScan,
  [JOB_NAMES.RESERVATION_SWEEP]: () => ReservationService.sweepExpired(),
  [JOB_NAMES.LOT_EXPIRY_SCAN]: lotExpiryScan
};

function createInventoryWorker() {
  const worker = new Worker(
    QUEUE_NAMES.INVENTORY,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown inventory job: ${job.name}`);
      return handler(job);
    },
    { connection: bullConnection(), prefix: config.queue.prefix, concurrency: config.queue.concurrency }
  );

  worker.on('completed', (job) => logger.info('Inventory job completed [%s]', job.name));
  worker.on('failed', (job, err) => logger.error('Inventory job failed [%s]: %s', job ? job.name : '-', err.message));
  worker.on('error', (err) => logger.error('Inventory worker error: %s', err.message));

  logger.info('Inventory worker started');
  return worker;
}

module.exports = { inventoryQueue, scheduleRecurringJobs, createInventoryWorker, lowStockScan, lotExpiryScan };
