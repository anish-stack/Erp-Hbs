'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const ZoneService = require('../services/zone.service');

class ZoneController {
  static list = asyncHandler(async (req, res) => {
    const zones = await ZoneService.list(req.params.id);
    return ApiResponse.ok(res, zones, 'Zones fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const zone = await ZoneService.create(req.params.id, req.body);
    return ApiResponse.created(res, zone, 'Zone created');
  });

  static update = asyncHandler(async (req, res) => {
    const zone = await ZoneService.update(req.params.zoneId, req.body);
    return ApiResponse.ok(res, zone, 'Zone updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await ZoneService.remove(req.params.zoneId);
    return ApiResponse.ok(res, result, 'Zone removed');
  });
}

module.exports = ZoneController;
