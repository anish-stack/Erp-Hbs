'use strict';

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { ApiError, logger, middlewares } = require('@erp/shared');
const AuditRepository = require('../repositories/audit.repository');
const ExportJobRepository = require('../repositories/exportJob.repository');
const AuditService = require('./audit.service');
const { enqueue } = require('../queues/audit.queue');
const { JOB_NAMES, EXPORT_COLUMNS } = require('../constants');
const config = require('../config');

const { hasPermission } = middlewares;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

class ExportService {
  static async request(filters, actorId) {
    const record = await ExportJobRepository.create({
      filters: Object.keys(filters).length ? filters : null,
      requestedBy: actorId
    });

    const jobId = await enqueue(JOB_NAMES.EXPORT_AUDIT, {
      exportJobId: record.id,
      filters,
      requestedBy: actorId
    });

    return {
      exportJobId: record.id,
      queueJobId: jobId,
      status: record.status,
      statusUrl: `${config.basePath}/audit/exports/${record.id}`
    };
  }

  /** Streams the filtered trail to an .xlsx file on disk. */
  static async generate({ exportJobId, filters, onProgress }) {
    const where = AuditService.buildWhere(filters || {});

    ensureDir(config.export.dir);
    const fileName = `audit-trail-${Date.now()}.xlsx`;
    const filePath = path.join(config.export.dir, fileName);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: filePath, useStyles: true });
    const sheet = workbook.addWorksheet('Audit Trail', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = EXPORT_COLUMNS.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width
    }));

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF13246B' } };
    header.height = 22;

    const written = await AuditRepository.stream(
      where,
      async (batch) => {
        for (const entry of batch) {
          sheet
            .addRow({
              occurredAt: new Date(entry.occurredAt).toISOString(),
              event: entry.event,
              entity: entry.entity,
              entityId: entry.entityId || '',
              action: entry.action,
              severity: entry.severity,
              actorId: entry.actorId || '',
              actorEmail: entry.actorEmail || '',
              source: entry.source,
              summary: entry.summary || '',
              ipAddress: entry.ipAddress || '',
              correlationId: entry.correlationId || ''
            })
            .commit();
        }
        if (onProgress) await onProgress(batch.length);
      },
      1000,
      config.export.maxRows
    );

    sheet.commit();
    await workbook.commit();

    logger.info('Audit export %s wrote %d rows', exportJobId, written);
    return { fileName, filePath, rows: written };
  }

  static async status(exportJobId, user) {
    const record = await ExportJobRepository.findById(exportJobId);
    if (!record) throw ApiError.notFound('Export job not found');

    if (record.requestedBy !== user.id && !hasPermission(user.permissions, 'audit.export')) {
      throw ApiError.forbidden('You cannot view this export');
    }

    return {
      id: record.id,
      status: record.status,
      totalRows: record.totalRows,
      processedRows: record.processedRows,
      fileName: record.fileName,
      message: record.message,
      downloadUrl:
        record.status === 'COMPLETED' && record.filePath
          ? `${config.basePath}/audit/exports/${record.id}/download`
          : null,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt
    };
  }

  static async resolveDownload(exportJobId, user) {
    const record = await ExportJobRepository.findById(exportJobId);
    if (!record) throw ApiError.notFound('Export job not found');

    if (record.requestedBy !== user.id && !hasPermission(user.permissions, 'audit.export')) {
      throw ApiError.forbidden('You cannot download this export');
    }

    if (record.status !== 'COMPLETED') throw ApiError.badRequest(`Export is ${record.status.toLowerCase()}`);
    if (!record.filePath || !fs.existsSync(record.filePath)) {
      throw ApiError.notFound('Export file has expired or was removed');
    }

    return { filePath: record.filePath, fileName: record.fileName };
  }

  static async purgeExpired() {
    const expired = await ExportJobRepository.expired();
    let removed = 0;

    for (const record of expired) {
      try {
        if (record.filePath && fs.existsSync(record.filePath)) {
          await fs.promises.unlink(record.filePath);
          removed += 1;
        }
      } catch (err) {
        logger.warn('Failed to delete export %s: %s', record.filePath, err.message);
      }
    }

    if (expired.length) await ExportJobRepository.clearFiles(expired.map((record) => record.id));
    return { removed };
  }
}

module.exports = ExportService;
