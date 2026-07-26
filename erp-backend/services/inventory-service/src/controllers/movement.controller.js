'use strict';

const { ApiResponse, asyncHandler, ApiError } = require('@erp/shared');
const MovementQueryService = require('../services/movement.query.service');

class MovementController {
  static listMovements = asyncHandler(async (req, res) => {
    const result = await MovementQueryService.listMovements(req.query);
    return ApiResponse.paginated(res, result, 'Movements fetched');
  });

  static listLots = asyncHandler(async (req, res) => {
    const result = await MovementQueryService.listLots(req.query);
    return ApiResponse.paginated(res, result, 'Lots fetched');
  });

  static getLot = asyncHandler(async (req, res) => {
    const lot = await MovementQueryService.getLot(req.params.id);
    if (!lot) throw ApiError.notFound('Lot not found');
    return ApiResponse.ok(res, lot, 'Lot fetched');
  });
}

module.exports = MovementController;
