'use strict';
const { logger } = require('@erp/shared');
const registry = require('../generators/registry');
const { buildXlsx } = require('../generators/xlsx.generator');
const { buildCsv } = require('../generators/csv.generator');
const client = require('../clients/internal.client');
const fileClient = require('../clients/file.client');
const ReportRunService = require('./reportRun.service');
const ReportRunRepository = require('../repositories/reportRun.repository');
const publisher = require('../events/publisher');
const { REPORT_FORMAT } = require('../constants');

/**
 * Full pipeline for one report run: fetch data from the owning service
 * (paginated), render it to XLSX or CSV in memory, upload the buffer to the
 * File service, and record the outcome on the ReportRun row. Called by the
 * BullMQ worker (queues/report.queue.js), never directly from HTTP.
 */
async function run(runId, user) {
  const runRow = await ReportRunRepository.findById(runId);
  if (!runRow) { logger.warn('Report run %s not found, skipping', runId); return; }

  await ReportRunService.markRunning(runId);

  try {
    const def = registry.definitionFor(runRow.reportKey);
    if (!def) throw new Error(`Unknown report key: ${runRow.reportKey}`);

    const query = { ...(def.defaultQuery || {}), ...(runRow.params || {}) };
    const rows = await client.fetchAllPages(def.baseUrl(), def.path, query, user);

    const format = runRow.format || REPORT_FORMAT.XLSX;
    const fileName = `${runRow.code}-${runRow.reportKey}.${format.toLowerCase()}`;
    const mimeType = format === REPORT_FORMAT.CSV
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const buffer = format === REPORT_FORMAT.CSV
      ? buildCsv({ columns: def.columns, rows, getValue: registry.get })
      : await buildXlsx({ sheetName: def.name, columns: def.columns, rows, getValue: registry.get });

    const uploaded = await fileClient.uploadReport({ buffer, fileName, mimeType, user });

    const updated = await ReportRunService.markCompleted(runId, {
      rowCount: rows.length,
      fileId: uploaded.id,
      fileName: uploaded.fileName || fileName,
      downloadPath: `/api/v1/files/${uploaded.id}/download`
    });

    await publisher.completed(updated, user ? user.id : null);
    logger.info('Report run %s completed (%d rows)', runRow.code, rows.length);
  } catch (err) {
    const updated = await ReportRunService.markFailed(runId, err.message);
    await publisher.failed(updated, user ? user.id : null);
    logger.error('Report run %s failed: %s', runRow.code, err.message);
    throw err;
  }
}

module.exports = { run };
