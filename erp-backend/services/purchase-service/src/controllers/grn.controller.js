'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const GrnService = require('../services/grn.service');

class GrnController {
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await GrnService.create(req.params.poId, req.body, req.user), 'GRN recorded'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await GrnService.getById(req.params.id), 'GRN fetched'));
  static forPo = asyncHandler(async (req, res) => ApiResponse.ok(res, await GrnService.forPo(req.params.poId), 'GRNs fetched'));
  static inspectionResult = asyncHandler(async (req, res) => ApiResponse.ok(res, await GrnService.recordInspectionResult(req.params.id, req.body.results, req.user), 'Inspection result recorded'));
}
module.exports = GrnController;
