'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const ReportRunService = require('../services/reportRun.service');

class ReportController {
  static definitions = asyncHandler(async (req, res) => ApiResponse.ok(res, ReportRunService.definitions(), 'Available reports fetched'));
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await ReportRunService.list(req.query), 'Report runs fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await ReportRunService.getById(req.params.id), 'Report run fetched'));
  static request = asyncHandler(async (req, res) => ApiResponse.created(res, await ReportRunService.request(req.body, req.user), 'Report queued'));
}
module.exports = ReportController;
