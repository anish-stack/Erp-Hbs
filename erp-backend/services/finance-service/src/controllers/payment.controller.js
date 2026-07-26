'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const PaymentService = require('../services/payment.service');

class PaymentController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await PaymentService.list(req.query), 'Payments fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await PaymentService.stats(), 'Payment statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await PaymentService.getById(req.params.id), 'Payment fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await PaymentService.create(req.body, req.user), 'Payment recorded'));
}
module.exports = PaymentController;
