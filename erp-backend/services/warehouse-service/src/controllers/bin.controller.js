'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const BinService = require('../services/bin.service');
const { BIN_STATUS } = require('../constants');

class BinController {
  static list = asyncHandler(async (req, res) => {
    const result = await BinService.list(req.params.id, req.query);
    return ApiResponse.paginated(res, result, 'Bins fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const bin = await BinService.create(req.params.id, req.body);
    return ApiResponse.created(res, bin, 'Bin created');
  });

  static bulkCreate = asyncHandler(async (req, res) => {
    const result = await BinService.bulkCreate(req.params.id, req.body);
    return ApiResponse.created(res, result, `Created ${result.created} bin(s)`);
  });

  static suggest = asyncHandler(async (req, res) => {
    const bin = await BinService.suggest(req.params.id, {
      zoneId: req.query.zoneId || null,
      mslZone: req.query.mslZone !== undefined ? req.query.mslZone : null,
      needUnits: Number(req.query.needUnits || 0)
    });
    return ApiResponse.ok(res, bin, bin ? 'Bin suggested' : 'No available bin found');
  });

  static get = asyncHandler(async (req, res) => {
    const bin = await BinService.getById(req.params.binId);
    return ApiResponse.ok(res, bin, 'Bin fetched');
  });

  static update = asyncHandler(async (req, res) => {
    const bin = await BinService.update(req.params.binId, req.body);
    return ApiResponse.ok(res, bin, 'Bin updated');
  });

  static block = asyncHandler(async (req, res) => {
    const bin = await BinService.setStatus(req.params.binId, BIN_STATUS.BLOCKED, req.body.reason);
    return ApiResponse.ok(res, bin, 'Bin blocked');
  });

  static unblock = asyncHandler(async (req, res) => {
    const bin = await BinService.setStatus(req.params.binId, BIN_STATUS.AVAILABLE, req.body.reason);
    return ApiResponse.ok(res, bin, 'Bin unblocked');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await BinService.remove(req.params.binId);
    return ApiResponse.ok(res, result, 'Bin removed');
  });
}

module.exports = BinController;
