'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const AdjustmentService = require('../services/adjustment.service');

class AdjustmentController {
  static list = asyncHandler(async (req, res) => {
    const result = await AdjustmentService.list(req.query);
    return ApiResponse.paginated(res, result, 'Adjustments fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.getById(req.params.id);
    return ApiResponse.ok(res, adjustment, 'Adjustment fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.create(req.body, req.user);
    return ApiResponse.created(res, adjustment, 'Adjustment created in draft');
  });

  static update = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, adjustment, 'Adjustment updated');
  });

  static submit = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.submit(req.params.id, req.user);
    return ApiResponse.ok(res, adjustment, 'Adjustment submitted for approval');
  });

  static approve = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.approve(req.params.id, req.user);
    return ApiResponse.ok(res, adjustment, 'Adjustment approved');
  });

  static reject = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.reject(req.params.id, req.body.reason, req.user);
    return ApiResponse.ok(res, adjustment, 'Adjustment rejected');
  });

  static post = asyncHandler(async (req, res) => {
    const adjustment = await AdjustmentService.post(req.params.id, req.user);
    return ApiResponse.ok(res, adjustment, 'Adjustment posted to ledger');
  });
}

module.exports = AdjustmentController;
