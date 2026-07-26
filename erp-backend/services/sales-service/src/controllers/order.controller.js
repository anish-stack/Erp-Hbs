'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const OrderService = require('../services/order.service');

class OrderController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await OrderService.list(req.query), 'Orders fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await OrderService.stats(), 'Sales statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await OrderService.getById(req.params.id), 'Order fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await OrderService.create(req.body, req.user), 'Order created'));
  static update = asyncHandler(async (req, res) => ApiResponse.ok(res, await OrderService.update(req.params.id, req.body, req.user), 'Order updated'));
  static confirm = asyncHandler(async (req, res) => {
    const result = await OrderService.confirm(req.params.id, req.user);
    return ApiResponse.ok(res, result, result.shortfalls.length ? 'Order confirmed with reservation shortfall' : 'Order confirmed and stock reserved');
  });
  static cancel = asyncHandler(async (req, res) => ApiResponse.ok(res, await OrderService.cancel(req.params.id, req.body.reason, req.user), 'Order cancelled'));
  static close = asyncHandler(async (req, res) => ApiResponse.ok(res, await OrderService.close(req.params.id, req.user), 'Order closed'));
}
module.exports = OrderController;
