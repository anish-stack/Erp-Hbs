'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const QuotationService = require('../services/quotation.service');

class QuotationController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await QuotationService.list(req.query), 'Quotations fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await QuotationService.getById(req.params.id), 'Quotation fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await QuotationService.create(req.body, req.user), 'Quotation created'));
  static update = asyncHandler(async (req, res) => ApiResponse.ok(res, await QuotationService.update(req.params.id, req.body, req.user), 'Quotation updated'));
  static send = asyncHandler(async (req, res) => ApiResponse.ok(res, await QuotationService.send(req.params.id, req.user), 'Quotation sent'));
  static accept = asyncHandler(async (req, res) => ApiResponse.ok(res, await QuotationService.accept(req.params.id, req.user), 'Quotation accepted'));
  static reject = asyncHandler(async (req, res) => ApiResponse.ok(res, await QuotationService.reject(req.params.id, req.user), 'Quotation rejected'));
  static convert = asyncHandler(async (req, res) => ApiResponse.created(res, await QuotationService.convert(req.params.id, req.body, req.user), 'Quotation converted to order'));
}
module.exports = QuotationController;
