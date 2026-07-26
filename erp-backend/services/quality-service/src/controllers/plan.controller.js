'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const PlanService = require('../services/plan.service');

class PlanController {
  static list = asyncHandler(async (req, res) => ApiResponse.ok(res, await PlanService.list(req.query), 'Plans fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await PlanService.getById(req.params.id), 'Plan fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await PlanService.create(req.body, req.user), 'Plan created'));
  static update = asyncHandler(async (req, res) => ApiResponse.ok(res, await PlanService.update(req.params.id, req.body), 'Plan updated'));
  static remove = asyncHandler(async (req, res) => ApiResponse.ok(res, await PlanService.remove(req.params.id), 'Plan removed'));
}
module.exports = PlanController;
