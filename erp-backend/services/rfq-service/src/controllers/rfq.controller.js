'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const RfqService = require('../services/rfq.service');
const QuoteService = require('../services/quote.service');
const AwardService = require('../services/award.service');

class RfqController {
  static list = asyncHandler(async (req, res) => {
    const result = await RfqService.list(req.query);
    return ApiResponse.paginated(res, result, 'RFQs fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await RfqService.stats();
    return ApiResponse.ok(res, stats, 'RFQ statistics fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const rfq = await RfqService.getById(req.params.id);
    return ApiResponse.ok(res, rfq, 'RFQ fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const rfq = await RfqService.create(req.body, req.user);
    return ApiResponse.created(res, rfq, 'RFQ created');
  });

  static update = asyncHandler(async (req, res) => {
    const rfq = await RfqService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, rfq, 'RFQ updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await RfqService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'RFQ deleted');
  });

  static addSuppliers = asyncHandler(async (req, res) => {
    const rfq = await RfqService.addSuppliers(req.params.id, req.body.supplierIds, req.user);
    return ApiResponse.ok(res, rfq, 'Suppliers invited');
  });

  static removeSupplier = asyncHandler(async (req, res) => {
    const result = await RfqService.removeSupplier(req.params.id, req.params.supplierId, req.user);
    return ApiResponse.ok(res, result, 'Supplier removed');
  });

  static send = asyncHandler(async (req, res) => {
    const rfq = await RfqService.send(req.params.id, req.user);
    return ApiResponse.ok(res, rfq, 'RFQ sent to invited suppliers');
  });

  static cancel = asyncHandler(async (req, res) => {
    const rfq = await RfqService.cancel(req.params.id, req.body.reason, req.user);
    return ApiResponse.ok(res, rfq, 'RFQ cancelled');
  });

  static markCompared = asyncHandler(async (req, res) => {
    const rfq = await RfqService.markCompared(req.params.id, req.user);
    return ApiResponse.ok(res, rfq, 'RFQ marked compared');
  });

  static close = asyncHandler(async (req, res) => {
    const rfq = await RfqService.close(req.params.id, req.user);
    return ApiResponse.ok(res, rfq, 'RFQ closed');
  });

  static submitQuote = asyncHandler(async (req, res) => {
    const quote = await QuoteService.submit(req.params.id, req.params.supplierId, req.body, req.user);
    return ApiResponse.created(res, quote, 'Quote submitted');
  });

  static declineQuote = asyncHandler(async (req, res) => {
    const result = await QuoteService.decline(req.params.id, req.params.supplierId, req.body.reason, req.user);
    return ApiResponse.ok(res, result, 'Supplier marked as declined');
  });

  static compare = asyncHandler(async (req, res) => {
    const result = await QuoteService.compareSheet(req.params.id);
    return ApiResponse.ok(res, result, 'Comparison sheet generated');
  });

  static award = asyncHandler(async (req, res) => {
    const result = await AwardService.award(req.params.id, req.body.awards, req.user);
    return ApiResponse.ok(res, result, 'RFQ awarded');
  });
}

module.exports = RfqController;
