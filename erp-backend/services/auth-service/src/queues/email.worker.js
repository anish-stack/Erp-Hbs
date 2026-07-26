'use strict';

const { Worker, QueueEvents } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const { sendMail } = require('../utils/mailer');
const templates = require('../utils/emailTemplates');

const handlers = {
  [JOB_NAMES.WELCOME_EMAIL]: (data) => templates.welcome(data),
  [JOB_NAMES.OTP_EMAIL]: (data) => templates.otp(data),
  [JOB_NAMES.PASSWORD_RESET_EMAIL]: (data) => templates.passwordReset(data),
  [JOB_NAMES.PASSWORD_CHANGED_EMAIL]: (data) => templates.passwordChanged(data),
  [JOB_NAMES.ACCOUNT_LOCKED_EMAIL]: (data) => templates.accountLocked(data)
};

function createEmailWorker() {
  const worker = new Worker(
    QUEUE_NAMES.EMAIL,
    async (job) => {
      const build = handlers[job.name];
      if (!build) throw new Error(`Unknown email job: ${job.name}`);

      const { subject, html } = build(job.data);
      await sendMail({ to: job.data.to, subject, html });
      return { to: job.data.to, subject };
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: config.queue.concurrency
    }
  );

  worker.on('completed', (job) => logger.info('Job completed [%s] id=%s', job.name, job.id));
  worker.on('failed', (job, err) =>
    logger.error(
      'Job failed [%s] id=%s attempt=%d/%d: %s',
      job ? job.name : 'unknown',
      job ? job.id : '-',
      job ? job.attemptsMade : 0,
      config.queue.attempts,
      err.message
    )
  );
  worker.on('error', (err) => logger.error('Email worker error: %s', err.message));

  const events = new QueueEvents(QUEUE_NAMES.EMAIL, {
    connection: bullConnection(),
    prefix: config.queue.prefix
  });
  events.on('stalled', ({ jobId }) => logger.warn('Email job stalled id=%s', jobId));

  logger.info('Email worker started (concurrency %d)', config.queue.concurrency);
  return { worker, events };
}

module.exports = { createEmailWorker };
