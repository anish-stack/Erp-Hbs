'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const InspectionService = require('../services/inspection.service');

class InspectionController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await InspectionService.list(req.query), 'Inspections fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.stats(), 'Quality statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.getById(req.params.id), 'Inspection fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await InspectionService.create(req.body, req.user), 'Inspection created'));
  static start = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.start(req.params.id, req.user), 'Inspection started'));
  static results = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.setResults(req.params.id, req.body.results, req.user), 'Results recorded'));
  static complete = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.complete(req.params.id, req.body, req.user), 'Inspection completed'));
  static hold = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.hold(req.params.id, req.body.reason, req.user), 'Inspection on hold'));
  static cancel = asyncHandler(async (req, res) => ApiResponse.ok(res, await InspectionService.cancel(req.params.id, req.body.reason, req.user), 'Inspection cancelled'));
}
module.exports = InspectionController;
