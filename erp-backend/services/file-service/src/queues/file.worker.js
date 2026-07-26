'use strict';

const { Worker } = require('bullmq');
const { logger } = require('@erp/shared');
const config = require('../config');
const { QUEUE_NAMES, JOB_NAMES } = require('../constants');
const { bullConnection } = require('./connection');
const ImageService = require('../services/image.service');
const PurgeTaskRepository = require('../repositories/purgeTask.repository');
const FileRepository = require('../repositories/file.repository');
const { getProvider } = require('../services/providers');

/** Physically removes objects (and their variants) for soft-deleted files. */
async function purgeObjects() {
  const tasks = await PurgeTaskRepository.pending();
  let purged = 0;

  for (const task of tasks) {
    try {
      const provider = getProvider(task.provider);
      await provider.delete(task.storageKey);

      if (task.variants) {
        for (const variant of Object.values(task.variants)) {
          if (variant && variant.key) await provider.delete(variant.key).catch(() => {});
        }
      }

      await PurgeTaskRepository.markPurged(task.id);
      purged += 1;
    } catch (err) {
      logger.warn('Purge failed for %s: %s', task.storageKey, err.message);
      await PurgeTaskRepository.markFailed(task.id, err.message);
    }
  }

  if (tasks.length) logger.info('Purged %d/%d storage object(s)', purged, tasks.length);
  return { purged, attempted: tasks.length };
}

/** Uploads never attached to a business record are cleaned up daily. */
async function cleanOrphans() {
  const cutoff = new Date(Date.now() - config.storage.orphanRetentionHours * 3600000);
  const orphans = await FileRepository.orphans(cutoff);

  for (const file of orphans) {
    await FileRepository.softDelete(file.id, null);
    await PurgeTaskRepository.create({
      fileId: file.id,
      storageKey: file.storageKey,
      provider: file.provider,
      bucket: file.bucket,
      variants: file.variants || null
    });
  }

  if (orphans.length) logger.warn('Marked %d orphaned upload(s) for deletion', orphans.length);
  return { orphans: orphans.length };
}

const handlers = {
  [JOB_NAMES.PROCESS_IMAGE]: (job) => ImageService.generateVariants(job.data.fileId),
  [JOB_NAMES.PURGE_OBJECTS]: purgeObjects,
  [JOB_NAMES.CLEAN_ORPHANS]: cleanOrphans
};

function createFileWorker() {
  const worker = new Worker(
    QUEUE_NAMES.FILE,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`Unknown file job: ${job.name}`);
      return handler(job);
    },
    {
      connection: bullConnection(),
      prefix: config.queue.prefix,
      concurrency: config.queue.concurrency
    }
  );

  worker.on('completed', (job) => logger.info('File job completed [%s] id=%s', job.name, job.id));

  worker.on('failed', async (job, err) => {
    logger.error('File job failed [%s]: %s', job ? job.name : '-', err.message);

    if (
      job &&
      job.name === JOB_NAMES.PROCESS_IMAGE &&
      job.data.fileId &&
      job.attemptsMade >= config.queue.attempts
    ) {
      await ImageService.markFailed(job.data.fileId, err.message);
    }
  });

  worker.on('error', (err) => logger.error('File worker error: %s', err.message));

  logger.info('File worker started (concurrency %d)', config.queue.concurrency);
  return worker;
}

module.exports = { createFileWorker, purgeObjects, cleanOrphans };
