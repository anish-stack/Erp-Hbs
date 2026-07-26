'use strict';

const { Queue } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');

const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: bullConnection(),
  prefix: config.queue.prefix,
  defaultJobOptions: {
    attempts: config.queue.attempts,
    backoff: { type: 'exponential', delay: config.queue.backoffMs },
    removeOnComplete: { age: 3600, count: 500 },
    removeOnFail: { age: 86400 }
  }
});

emailQueue.on('error', (err) => logger.error('Email queue error: %s', err.message));

/** Never let a queue outage break an auth flow. */
async function enqueue(jobName, payload, options = {}) {
  try {
    const job = await emailQueue.add(jobName, payload, options);
    logger.info('Job queued [%s] id=%s', jobName, job.id);
    return job.id;
  } catch (err) {
    logger.error('Failed to queue job [%s]: %s', jobName, err.message);
    return null;
  }
}

module.exports = {
  emailQueue,
  enqueue,
  sendWelcome: (payload) => enqueue(JOB_NAMES.WELCOME_EMAIL, payload),
  sendOtp: (payload) => enqueue(JOB_NAMES.OTP_EMAIL, payload, { priority: 1 }),
  sendPasswordReset: (payload) => enqueue(JOB_NAMES.PASSWORD_RESET_EMAIL, payload, { priority: 1 }),
  sendPasswordChanged: (payload) => enqueue(JOB_NAMES.PASSWORD_CHANGED_EMAIL, payload),
  sendAccountLocked: (payload) => enqueue(JOB_NAMES.ACCOUNT_LOCKED_EMAIL, payload)
};
