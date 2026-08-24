'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const PartService = require('../services/part.service');

class PartController {
  static list = asyncHandler(async (req, res) => {
    const result = await PartService.list(req.query);
    return ApiResponse.paginated(res, result, 'Parts fetched');
  });

  static search = asyncHandler(async (req, res) => {
    const result = await PartService.search(req.query.search, {
      limit: req.query.limit,
      categoryPath: req.query.categoryPath
    });
    return ApiResponse.ok(res, result, `${result.count} match(es) found`);
  });

  static get = asyncHandler(async (req, res) => {
    const part = await PartService.getById(req.params.id);
    return ApiResponse.ok(res, part, 'Part fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const part = await PartService.create(req.body, req.user.id);
    return ApiResponse.created(res, part, 'Part created');
  });

  static update = asyncHandler(async (req, res) => {
    const part = await PartService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, part, 'Part updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await PartService.remove(req.params.id, req.user.id);
    return ApiResponse.ok(res, result, 'Part deleted');
  });

  static addAlternate = asyncHandler(async (req, res) => {
    const part = await PartService.addAlternate(req.params.id, req.body, req.user.id);
    return ApiResponse.ok(res, part, 'Alternate linked');
  });

  static removeAlternate = asyncHandler(async (req, res) => {
    const result = await PartService.removeAlternate(req.params.id, req.params.alternateId);
    return ApiResponse.ok(res, result, 'Alternate unlinked');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await PartService.stats();
    return ApiResponse.ok(res, stats, 'Part statistics fetched');
  });
}

module.exports = PartController;
