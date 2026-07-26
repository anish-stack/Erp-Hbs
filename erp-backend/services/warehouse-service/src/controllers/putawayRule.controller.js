'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const PutawayRuleService = require('../services/putawayRule.service');

class PutawayRuleController {
  static list = asyncHandler(async (req, res) => {
    const rules = await PutawayRuleService.list(req.params.id);
    return ApiResponse.ok(res, rules, 'Putaway rules fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const rule = await PutawayRuleService.create(req.params.id, req.body);
    return ApiResponse.created(res, rule, 'Putaway rule created');
  });

  static update = asyncHandler(async (req, res) => {
    const rule = await PutawayRuleService.update(req.params.ruleId, req.body);
    return ApiResponse.ok(res, rule, 'Putaway rule updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await PutawayRuleService.remove(req.params.ruleId);
    return ApiResponse.ok(res, result, 'Putaway rule removed');
  });

  static suggest = asyncHandler(async (req, res) => {
    const result = await PutawayRuleService.resolveBin(req.params.id, {
      partId: req.query.partId || null,
      categoryId: req.query.categoryId || null,
      needUnits: Number(req.query.needUnits || 0),
      mslRequired: req.query.mslRequired !== undefined ? req.query.mslRequired : null
    });
    return ApiResponse.ok(res, result, result.bin ? 'Destination resolved' : 'No destination bin available');
  });
}

module.exports = PutawayRuleController;
