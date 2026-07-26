'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const StockService = require('../services/stock.service');

class StockController {
  static list = asyncHandler(async (req, res) => {
    const result = await StockService.list(req.query);
    return ApiResponse.paginated(res, result, 'Stock positions fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const item = await StockService.getById(req.params.id);
    return ApiResponse.ok(res, item, 'Stock position fetched');
  });

  static byPart = asyncHandler(async (req, res) => {
    const result = await StockService.byPart(req.params.partId);
    return ApiResponse.ok(res, result, 'Part stock fetched');
  });

  static availability = asyncHandler(async (req, res) => {
    const result = await StockService.availability(req.query.partId, req.query.warehouseId, req.query.quantity || 0);
    return ApiResponse.ok(res, result, 'Availability checked');
  });

  static receipt = asyncHandler(async (req, res) => {
    const result = await StockService.receipt(req.body, req.user);
    return ApiResponse.created(res, result, 'Stock received');
  });

  static issue = asyncHandler(async (req, res) => {
    const result = await StockService.issue(req.body, req.user);
    return ApiResponse.created(res, result, 'Stock issued');
  });

  static transfer = asyncHandler(async (req, res) => {
    const result = await StockService.transfer(req.body, req.user);
    return ApiResponse.created(res, result, 'Stock transferred');
  });

  static setReorder = asyncHandler(async (req, res) => {
    const item = await StockService.setReorderRules(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, item, 'Reorder rules updated');
  });

  static lowStock = asyncHandler(async (req, res) => {
    const rows = await StockService.lowStock();
    return ApiResponse.ok(res, rows, 'Low-stock positions fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await StockService.stats();
    return ApiResponse.ok(res, stats, 'Inventory statistics fetched');
  });
}

module.exports = StockController;
