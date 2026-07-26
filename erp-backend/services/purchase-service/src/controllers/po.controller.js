'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const PoService = require('../services/po.service');

class PoController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await PoService.list(req.query), 'Purchase orders fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.stats(), 'PO statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.getById(req.params.id), 'Purchase order fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await PoService.create(req.body, req.user), 'Purchase order created'));
  static update = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.update(req.params.id, req.body, req.user), 'Purchase order updated'));
  static remove = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.remove(req.params.id, req.user), 'Purchase order deleted'));
  static submit = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.submit(req.params.id, req.user), 'Purchase order submitted'));
  static approve = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.approve(req.params.id, req.user), 'Purchase order approved'));
  static reject = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.reject(req.params.id, req.body.reason, req.user), 'Purchase order rejected'));
  static issue = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.issue(req.params.id, req.user), 'Purchase order issued'));
  static cancel = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.cancel(req.params.id, req.body.reason, req.user), 'Purchase order cancelled'));
  static close = asyncHandler(async (req, res) => ApiResponse.ok(res, await PoService.close(req.params.id, req.user), 'Purchase order closed'));
}
module.exports = PoController;
