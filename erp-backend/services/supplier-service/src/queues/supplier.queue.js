'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const DocumentService = require('../services/document.service');
const RatingRepository = require('../repositories/rating.repository');
const RatingService = require('../services/rating.service');
const SupplierRepository = require('../repositories/supplier.repository');

const supplierQueue = new Queue(QUEUE_NAMES.SUPPLIER, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 172800 }
  }
});

supplierQueue.on('error', (err) => logger.error('Supplier queue error: %s', err.message));

async function scheduleRecurringJobs() {
  const schedules = [
    { name: JOB_NAMES.DOCUMENT_EXPIRY_SCAN, cron: config.documents.expiryCron },
    { name: JOB_NAMES.RATING_RECALC, cron: config.rating.recalcCron }
  ];

  for (const schedule of schedules) {
    try {
      await supplierQueue.add(schedule.name, {}, { repeat: { pattern: schedule.cron }, jobId: schedule.name });
      logger.info('Recurring job scheduled: %s (%s)', schedule.name, schedule.cron);
    } catch (err) {
      logger.error('Failed to schedule %s: %s', schedule.name, err.message);
    }
  }
}

/** Refreshes the rolling rating of every supplier that had activity. */
async function recalculateRatings() {
  const performances = await RatingRepository.allWithActivity();
  let updated = 0;

  for (const performance of performances) {
    const derived = RatingService.scoresFromPerformance(performance);
    const overall = RatingService.weightedOverall({
      ...derived,
      priceScore: 0,
      complianceScore: 0
    });

    await SupplierRepository.update(
      performance.supplierId,
      { overallRating: overall, riskLevel: RatingService.riskOf(overall) },
      null
    ).catch(() => {});

    updated += 1;
  }

  logger.info('Recalculated rolling ratings for %d supplier(s)', updated);
  return { updated };
}

const handlers = {
  [JOB_NAMES.DOCUMENT_EXPIRY_SCAN]: () => DocumentService.scanExpiries(),
  [JOB_NAMES.RATING_RECALC]: recalculateRatings
};

function createSupplierWorker() {
  const worker = new Worker(
    QUEUE_NAMES.SUPPLIER,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown supplier job: ${job.name}`);
      return handler(job);
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: config.queue.concurrency
    }
  );

  worker.on('completed', (job) => logger.info('Supplier job completed [%s]', job.name));
  worker.on('failed', (job, err) =>
    logger.error('Supplier job failed [%s]: %s', job ? job.name : '-', err.message)
  );
  worker.on('error', (err) => logger.error('Supplier worker error: %s', err.message));

  logger.info('Supplier worker started');
  return worker;
}

module.exports = { supplierQueue, scheduleRecurringJobs, createSupplierWorker, recalculateRatings };
