'use strict';

const { Queue, Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const SessionRepository = require('../repositories/session.repository');

const cleanupQueue = new Queue(QUEUE_NAMES.SESSION_CLEANUP, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 30000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { age: 86400 }
  }
});

cleanupQueue.on('error', (err) => logger.error('Session cleanup queue error: %s', err.message));

/** Hourly purge of expired refresh sessions. */
async function scheduleRecurringJobs() {
  try {
    await cleanupQueue.add(
      JOB_NAMES.PURGE_EXPIRED_SESSIONS,
      {},
      {
        repeat: { pattern: '0 * * * *' },
        jobId: JOB_NAMES.PURGE_EXPIRED_SESSIONS
      }
    );
    logger.info('Recurring job scheduled: %s (hourly)', JOB_NAMES.PURGE_EXPIRED_SESSIONS);
  } catch (err) {
    logger.error('Failed to schedule recurring jobs: %s', err.message);
  }
}

function createSessionCleanupWorker() {
  const worker = new Worker(
    QUEUE_NAMES.SESSION_CLEANUP,
    async () => {
      const removed = await SessionRepository.purgeExpired();
      logger.info('Purged %d expired sessions', removed);
      return { removed };
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: 1
    }
  );

  worker.on('failed', (job, err) => logger.error('Session cleanup failed: %s', err.message));
  return worker;
}

module.exports = { cleanupQueue, scheduleRecurringJobs, createSessionCleanupWorker };
