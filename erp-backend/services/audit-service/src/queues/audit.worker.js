'use strict';

const { Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const ExportJobRepository = require('../repositories/exportJob.repository');
const ExportService = require('../services/export.service');
const RollupService = require('../services/rollup.service');

async function handleExport(job) {
  const { exportJobId, filters } = job.data;

  await ExportJobRepository.update(exportJobId, {
    status: 'PROCESSING',
    startedAt: new Date(),
    jobId: String(job.id)
  });

  let processed = 0;
  const result = await ExportService.generate({
    exportJobId,
    filters,
    onProgress: async (count) => {
      processed += count;
      await job.updateProgress({ processed });
      await ExportJobRepository.update(exportJobId, { processedRows: processed });
    }
  });

  await ExportJobRepository.update(exportJobId, {
    status: 'COMPLETED',
    fileName: result.fileName,
    filePath: result.filePath,
    totalRows: result.rows,
    processedRows: result.rows,
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + config.export.retentionHours * 3600000),
    message: `Exported ${result.rows} audit entries`
  });

  return { rows: result.rows };
}

const handlers = {
  [JOB_NAMES.EXPORT_AUDIT]: handleExport,
  [JOB_NAMES.ROLLUP_DAILY]: () => RollupService.runDaily(),
  [JOB_NAMES.PURGE_RETENTION]: () => RollupService.purgeRetention(),
  [JOB_NAMES.PURGE_EXPORTS]: () => ExportService.purgeExpired()
};

function createAuditWorker() {
  const worker = new Worker(
    QUEUE_NAMES.AUDIT,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown audit job: ${job.name}`);
      return handler(job);
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: config.queue.concurrency
    }
  );

  worker.on('completed', (job) => logger.info('Audit job completed [%s] id=%s', job.name, job.id));

  worker.on('failed', async (job, err) => {
    logger.error('Audit job failed [%s]: %s', job ? job.name : '-', err.message);

    if (job && job.data && job.data.exportJobId && job.attemptsMade >= config.queue.attempts) {
      await ExportJobRepository.update(job.data.exportJobId, {
        status: 'FAILED',
        completedAt: new Date(),
        message: err.message.slice(0, 500)
      }).catch(() => {});
    }
  });

  worker.on('error', (err) => logger.error('Audit worker error: %s', err.message));

  logger.info('Audit worker started (concurrency %d)', config.queue.concurrency);
  return worker;
}

module.exports = { createAuditWorker };
