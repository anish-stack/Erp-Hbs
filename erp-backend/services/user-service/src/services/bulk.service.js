'use strict';

const fs = require('fs');
const path = require('path');
const { ApiError, utils } = require('@erp/shared');
const { prisma } = require('../config/prisma');
const BulkJobRepository = require('../repositories/bulkJob.repository');
const DepartmentRepository = require('../repositories/department.repository');
const ExcelService = require('./excel.service');
const { enqueue } = require('../queues/bulk.queue');
const { JOB_NAMES, BULK_JOB_TYPE, BULK_JOB_STATUS } = require('../constants');
const config = require('../config');

class BulkService {
  static async requestExport(filters, actorId) {
    const record = await BulkJobRepository.create({
      type: BULK_JOB_TYPE.EXPORT,
      entity: 'user',
      status: BULK_JOB_STATUS.QUEUED,
      filters: Object.keys(filters).length ? filters : null,
      requestedBy: actorId
    });

    const jobId = await enqueue(JOB_NAMES.EXPORT_USERS, {
      bulkJobId: record.id,
      filters,
      requestedBy: actorId
    });

    return {
      bulkJobId: record.id,
      queueJobId: jobId,
      status: record.status,
      statusUrl: `${config.basePath}/users/bulk/${record.id}`
    };
  }

  static async requestImport(file, options, actorId) {
    if (!file) throw ApiError.badRequest('An .xlsx file is required');

    const record = await BulkJobRepository.create({
      type: BULK_JOB_TYPE.IMPORT,
      entity: 'user',
      status: BULK_JOB_STATUS.QUEUED,
      fileName: file.originalname,
      filePath: file.path,
      requestedBy: actorId
    });

    const jobId = await enqueue(JOB_NAMES.IMPORT_USERS, {
      bulkJobId: record.id,
      filePath: file.path,
      defaultPassword: options.defaultPassword || utils.password.randomToken(6),
      requestedBy: actorId
    });

    return {
      bulkJobId: record.id,
      queueJobId: jobId,
      status: record.status,
      fileName: file.originalname,
      statusUrl: `${config.basePath}/users/bulk/${record.id}`
    };
  }

  static async status(bulkJobId, user) {
    const record = await BulkJobRepository.findById(bulkJobId);
    if (!record) throw ApiError.notFound('Bulk job not found');

    const isOwner = record.requestedBy === user.id;
    const isAdmin = user.permissions.includes('*.*') || user.permissions.includes('user.export');
    if (!isOwner && !isAdmin) throw ApiError.forbidden('You cannot view this job');

    return {
      id: record.id,
      type: record.type,
      entity: record.entity,
      status: record.status,
      fileName: record.fileName,
      totalRows: record.totalRows,
      processedRows: record.processedRows,
      successRows: record.successRows,
      failedRows: record.failedRows,
      progressPercent:
        record.totalRows > 0 ? Math.round((record.processedRows / record.totalRows) * 100) : 0,
      message: record.message,
      errorReport: record.errorReport,
      downloadUrl:
        record.type === BULK_JOB_TYPE.EXPORT && record.status === BULK_JOB_STATUS.COMPLETED && record.filePath
          ? `${config.basePath}/users/bulk/${record.id}/download`
          : null,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt
    };
  }

  static async list(query, user) {
    const pagination = utils.pagination.buildPagination(query, {
      allowedSortFields: ['createdAt', 'status', 'type'],
      defaultSortField: 'createdAt'
    });

    const isAdmin = user.permissions.includes('*.*') || user.permissions.includes('user.export');

    const where = {
      ...(isAdmin ? {} : { requestedBy: user.id }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {})
    };

    const { items, total } = await BulkJobRepository.paginate({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: pagination.orderBy
    });

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  /** Resolves the on-disk export for streaming back to the client. */
  static async resolveDownload(bulkJobId, user) {
    const record = await BulkJobRepository.findById(bulkJobId);
    if (!record) throw ApiError.notFound('Bulk job not found');

    const isOwner = record.requestedBy === user.id;
    const isAdmin = user.permissions.includes('*.*') || user.permissions.includes('user.export');
    if (!isOwner && !isAdmin) throw ApiError.forbidden('You cannot download this file');

    if (record.type !== BULK_JOB_TYPE.EXPORT) throw ApiError.badRequest('Job is not an export');
    if (record.status !== BULK_JOB_STATUS.COMPLETED) {
      throw ApiError.badRequest(`Export is ${record.status.toLowerCase()}`);
    }
    if (!record.filePath || !fs.existsSync(record.filePath)) {
      throw ApiError.notFound('Export file has expired or was removed');
    }

    return { filePath: record.filePath, fileName: record.fileName || path.basename(record.filePath) };
  }

  static async buildTemplate() {
    const [roles, departments] = await Promise.all([
      prisma.role.findMany({
        where: { deletedAt: null, isActive: true },
        select: { code: true, name: true },
        orderBy: { code: 'asc' }
      }),
      DepartmentRepository.findAllActive()
    ]);

    const filePath = path.join(config.bulk.exportDir, `user-import-template-${Date.now()}.xlsx`);
    await ExcelService.buildImportTemplate({ roles, departments, filePath });

    return { filePath, fileName: 'user-import-template.xlsx' };
  }
}

module.exports = BulkService;
