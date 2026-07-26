'use strict';

const fs = require('fs');
const { ApiResponse, asyncHandler } = require('@erp/shared');
const AuditService = require('../services/audit.service');
const IngestService = require('../services/ingest.service');
const ExportService = require('../services/export.service');
const contextOf = require('../utils/requestContext');

class AuditController {
  static list = asyncHandler(async (req, res) => {
    const result = await AuditService.list(req.query);
    return ApiResponse.paginated(res, result, 'Audit entries fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const entry = await AuditService.getById(req.params.id);
    return ApiResponse.ok(res, entry, 'Audit entry fetched');
  });

  static timeline = asyncHandler(async (req, res) => {
    const result = await AuditService.timeline(req.params.entity, req.params.entityId, req.query);
    return ApiResponse.ok(res, result, 'Entity timeline fetched');
  });

  static trace = asyncHandler(async (req, res) => {
    const result = await AuditService.trace(req.params.correlationId);
    return ApiResponse.ok(res, result, 'Correlation trace fetched');
  });

  static userActivity = asyncHandler(async (req, res) => {
    const result = await AuditService.userActivity(req.params.userId, req.query, req.user);
    return ApiResponse.paginated(res, result, 'User activity fetched');
  });

  static myActivity = asyncHandler(async (req, res) => {
    const result = await AuditService.list({ ...req.query, actorId: req.user.id });
    return ApiResponse.paginated(res, result, 'Your activity fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await AuditService.stats(req.query);
    return ApiResponse.ok(res, stats, 'Audit statistics fetched');
  });

  static summaries = asyncHandler(async (req, res) => {
    const result = await AuditService.summaries(req.query);
    return ApiResponse.ok(res, result, 'Daily summaries fetched');
  });

  static ingest = asyncHandler(async (req, res) => {
    const context = contextOf(req);
    const result = await IngestService.fromApi(
      { ...req.body, ipAddress: context.ipAddress, userAgent: context.userAgent, requestId: req.id },
      req.user
    );
    return ApiResponse.created(res, result, result.duplicate ? 'Event already recorded' : 'Audit entry recorded');
  });

  static requestExport = asyncHandler(async (req, res) => {
    const result = await ExportService.request(req.body || {}, req.user.id);
    return ApiResponse.accepted(res, result, 'Audit export queued');
  });

  static exportStatus = asyncHandler(async (req, res) => {
    const status = await ExportService.status(req.params.exportJobId, req.user);
    return ApiResponse.ok(res, status, 'Export status fetched');
  });

  static exportDownload = asyncHandler(async (req, res) => {
    const { filePath, fileName } = await ExportService.resolveDownload(req.params.exportJobId, req.user);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return fs.createReadStream(filePath).pipe(res);
  });

  static deadLetters = asyncHandler(async (req, res) => {
    const result = await AuditService.deadLetters(req.query);
    return ApiResponse.paginated(res, result, 'Dead letters fetched');
  });

  static resolveDeadLetter = asyncHandler(async (req, res) => {
    const result = await AuditService.resolveDeadLetter(req.params.id);
    return ApiResponse.ok(res, result, 'Dead letter marked resolved');
  });
}

module.exports = AuditController;
