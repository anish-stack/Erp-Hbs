'use strict';

const fs = require('fs');
const path = require('path');
const { Worker } = require('bullmq');
const { logger, cache } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES, BULK_JOB_STATUS, CACHE } = require('../constants');
const { bullConnection } = require('./connection');
const BulkJobRepository = require('../repositories/bulkJob.repository');
const ExcelService = require('../services/excel.service');
const ImportService = require('../services/import.service');
const publisher = require('../events/publisher');

async function handleExport(job) {
  const { bulkJobId, filters, requestedBy } = job.data;

  await BulkJobRepository.update(bulkJobId, {
    status: BULK_JOB_STATUS.PROCESSING,
    startedAt: new Date(),
    jobId: String(job.id)
  });

  const fileName = `users-export-${Date.now()}.xlsx`;
  const filePath = path.join(config.bulk.exportDir, fileName);

  const result = await ExcelService.exportUsers({
    filters,
    filePath,
    onProgress: async (written) => {
      await job.updateProgress({ written });
      await BulkJobRepository.update(bulkJobId, { processedRows: written });
    }
  });

  const completed = await BulkJobRepository.update(bulkJobId, {
    status: BULK_JOB_STATUS.COMPLETED,
    fileName,
    filePath,
    totalRows: result.rows,
    processedRows: result.rows,
    successRows: result.rows,
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + config.bulk.retentionHours * 3600000),
    message: `Exported ${result.rows} users`
  });

  await publisher.audit(
    { entity: 'user', action: 'EXPORT', rows: result.rows, bulkJobId },
    requestedBy
  );

  return { rows: result.rows, fileName: completed.fileName };
}

async function handleImport(job) {
  const { bulkJobId, filePath, defaultPassword, requestedBy } = job.data;

  await BulkJobRepository.update(bulkJobId, {
    status: BULK_JOB_STATUS.PROCESSING,
    startedAt: new Date(),
    jobId: String(job.id)
  });

  const result = await ImportService.run({
    filePath,
    defaultPassword,
    actorId: requestedBy,
    onProgress: async (processed, total) => {
      await job.updateProgress({ processed, total });
      await BulkJobRepository.update(bulkJobId, { processedRows: processed, totalRows: total });
    }
  });

  const status = result.failedRows === 0
    ? BULK_JOB_STATUS.COMPLETED
    : result.successRows === 0
      ? BULK_JOB_STATUS.FAILED
      : BULK_JOB_STATUS.PARTIAL;

  await BulkJobRepository.update(bulkJobId, {
    status,
    totalRows: result.totalRows,
    processedRows: result.totalRows,
    successRows: result.successRows,
    failedRows: result.failedRows,
    errorReport: result.errors.length ? result.errors : null,
    completedAt: new Date(),
    message: `${result.successRows} created, ${result.failedRows} rejected`
  });

  await cache.delByPattern(CACHE.pattern);

  await publisher.audit(
    {
      entity: 'user',
      action: 'IMPORT',
      created: result.successRows,
      rejected: result.failedRows,
      bulkJobId
    },
    requestedBy
  );

  fs.promises.unlink(filePath).catch(() => {});

  return result;
}

/** Deletes export files past their retention window. */
async function handlePurge() {
  const expired = await BulkJobRepository.expired();
  let removed = 0;

  for (const record of expired) {
    try {
      if (record.filePath && fs.existsSync(record.filePath)) {
        await fs.promises.unlink(record.filePath);
        removed += 1;
      }
    } catch (err) {
      logger.warn('Failed to remove export %s: %s', record.filePath, err.message);
    }
  }

  if (expired.length) await BulkJobRepository.clearFilePath(expired.map((record) => record.id));

  logger.info('Purged %d expired export file(s)', removed);
  return { removed };
}

const handlers = {
  [JOB_NAMES.EXPORT_USERS]: handleExport,
  [JOB_NAMES.IMPORT_USERS]: handleImport,
  [JOB_NAMES.PURGE_EXPORTS]: handlePurge
};

function createBulkWorker() {
  const worker = new Worker(
    QUEUE_NAMES.BULK,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown bulk job: ${job.name}`);
      return handler(job);
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: config.queue.concurrency
    }
  );

  worker.on('completed', (job) => logger.info('Bulk job completed [%s] id=%s', job.name, job.id));

  worker.on('failed', async (job, err) => {
    logger.error('Bulk job failed [%s] id=%s: %s', job ? job.name : '-', job ? job.id : '-', err.message);

    if (job && job.data && job.data.bulkJobId && job.attemptsMade >= config.queue.attempts) {
      await BulkJobRepository.update(job.data.bulkJobId, {
        status: BULK_JOB_STATUS.FAILED,
        completedAt: new Date(),
        message: err.message.slice(0, 500)
      }).catch(() => {});
    }
  });

  worker.on('error', (err) => logger.error('Bulk worker error: %s', err.message));

  logger.info('Bulk worker started (concurrency %d)', config.queue.concurrency);
  return worker;
}

module.exports = { createBulkWorker };
