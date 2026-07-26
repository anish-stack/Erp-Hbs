'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const WarehouseService = require('../services/warehouse.service');
const { WAREHOUSE_STATUS } = require('../constants');

class WarehouseController {
  static list = asyncHandler(async (req, res) => {
    const result = await WarehouseService.list(req.query);
    return ApiResponse.paginated(res, result, 'Warehouses fetched');
  });

  static options = asyncHandler(async (req, res) => {
    const options = await WarehouseService.options();
    return ApiResponse.ok(res, options, 'Active warehouse options fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await WarehouseService.stats();
    return ApiResponse.ok(res, stats, 'Warehouse statistics fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const w = await WarehouseService.getById(req.params.id);
    return ApiResponse.ok(res, w, 'Warehouse fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const w = await WarehouseService.create(req.body, req.user);
    return ApiResponse.created(res, w, 'Warehouse created');
  });

  static update = asyncHandler(async (req, res) => {
    const w = await WarehouseService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, w, 'Warehouse updated');
  });

  static activate = asyncHandler(async (req, res) => {
    const w = await WarehouseService.setStatus(req.params.id, WAREHOUSE_STATUS.ACTIVE, req.user);
    return ApiResponse.ok(res, w, 'Warehouse activated');
  });

  static deactivate = asyncHandler(async (req, res) => {
    const w = await WarehouseService.setStatus(req.params.id, WAREHOUSE_STATUS.INACTIVE, req.user);
    return ApiResponse.ok(res, w, 'Warehouse deactivated');
  });

  static setDefault = asyncHandler(async (req, res) => {
    const w = await WarehouseService.setDefault(req.params.id, req.user);
    return ApiResponse.ok(res, w, 'Default warehouse set');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await WarehouseService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Warehouse deleted');
  });
}

module.exports = WarehouseController;
