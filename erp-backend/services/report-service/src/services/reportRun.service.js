'use strict';
const { ApiError, utils } = require('@erp/shared');
const ReportRunRepository = require('../repositories/reportRun.repository');
const registry = require('../generators/registry');
const { RUN_STATUS, REPORT_FORMAT } = require('../constants');
const reportQueueModule = require('../queues/report.queue');

function shape(r) {
  if (!r) return null;
  return {
    id: r.id, code: r.code, reportKey: r.reportKey, reportName: r.reportName,
    format: r.format, status: r.status, params: r.params || {}, rowCount: r.rowCount,
    fileId: r.fileId, fileName: r.fileName, downloadPath: r.downloadPath,
    error: r.error, requestedBy: r.requestedBy,
    startedAt: r.startedAt, completedAt: r.completedAt, createdAt: r.createdAt
  };
}

async function nextCode() {
  const year = new Date().getFullYear();
  const n = await ReportRunRepository.countYear(year).catch(() => 0);
  return `RPT-${year}-${String(n + 1).padStart(5, '0')}`;
}

class ReportRunService {
  static definitions() { return registry.list(); }

  static async list(query) {
    const pagination = utils.pagination.buildPagination(query, { allowedSortFields: ['createdAt', 'code'], defaultSortField: 'createdAt' });
    const where = {
      ...(query.reportKey ? { reportKey: query.reportKey } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.requestedBy ? { requestedBy: query.requestedBy } : {})
    };
    const { items, total } = await ReportRunRepository.paginate({ where, skip: pagination.skip, take: pagination.take, orderBy: pagination.orderBy });
    return { items: items.map(shape), total, page: pagination.page, limit: pagination.limit };
  }

  static async getById(id) {
    const r = await ReportRunRepository.findById(id);
    if (!r) throw ApiError.notFound('Report run not found');
    return shape(r);
  }

  /** Queues a report generation job; the worker does the actual data pull + file build. */
  static async request(payload, user) {
    const def = registry.definitionFor(payload.reportKey);
    if (!def) throw ApiError.badRequest('Unknown report key', { reportKey: payload.reportKey, available: Object.keys(registry.REGISTRY) });

    const run = await ReportRunRepository.create({
      code: await nextCode(),
      reportKey: payload.reportKey,
      reportName: def.name,
      format: payload.format || REPORT_FORMAT.XLSX,
      status: RUN_STATUS.QUEUED,
      params: payload.params || {},
      requestedBy: user.id
    });

    await reportQueueModule.reportQueue.add('generate-report', { runId: run.id, user: { id: user.id, email: user.email, role: user.role, roleId: user.roleId, permissions: user.permissions } }, { jobId: run.id });

    return shape(run);
  }

  static async markRunning(id) {
    return ReportRunRepository.update(id, { status: RUN_STATUS.RUNNING, startedAt: new Date() });
  }

  static async markCompleted(id, { rowCount, fileId, fileName, downloadPath }) {
    return ReportRunRepository.update(id, {
      status: RUN_STATUS.COMPLETED, completedAt: new Date(), rowCount, fileId, fileName, downloadPath
    });
  }

  static async markFailed(id, error) {
    return ReportRunRepository.update(id, { status: RUN_STATUS.FAILED, completedAt: new Date(), error: String(error).slice(0, 1000) });
  }

  static async purgeOld(days) {
    const before = new Date(Date.now() - days * 86400 * 1000);
    const result = await ReportRunRepository.purgeOlderThan(before);
    return { purged: result.count };
  }

  static shape = shape;
}
module.exports = ReportRunService;
