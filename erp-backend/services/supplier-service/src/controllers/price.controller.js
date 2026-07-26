'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const PriceService = require('../services/price.service');

class PriceController {
  static list = asyncHandler(async (req, res) => {
    const result = await PriceService.list(req.query);
    return ApiResponse.paginated(res, result, 'Price entries fetched');
  });

  static compare = asyncHandler(async (req, res) => {
    const result = await PriceService.compare(req.query.partId, {
      quantity: req.query.quantity,
      includeUnapproved: req.query.includeUnapproved
    });
    return ApiResponse.ok(res, result, `${result.count} quote(s) compared`);
  });

  static create = asyncHandler(async (req, res) => {
    const price = await PriceService.upsert(req.params.id, req.body, req.user);
    return ApiResponse.created(res, price, 'Price entry added');
  });

  static bulkReplace = asyncHandler(async (req, res) => {
    const result = await PriceService.bulkReplace(req.params.id, req.body.rows, req.user);
    return ApiResponse.ok(res, result, `Price list replaced with ${result.replaced} entries`);
  });

  static update = asyncHandler(async (req, res) => {
    const price = await PriceService.update(req.params.priceId, req.body, req.user);
    return ApiResponse.ok(res, price, 'Price entry updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await PriceService.remove(req.params.priceId);
    return ApiResponse.ok(res, result, 'Price entry removed');
  });

  static partsOfSupplier = asyncHandler(async (req, res) => {
    const partIds = await PriceService.partsOf(req.params.id);
    return ApiResponse.ok(res, { supplierId: req.params.id, partIds, count: partIds.length }, 'Parts fetched');
  });
}

module.exports = PriceController;
