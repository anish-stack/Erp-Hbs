'use strict';
const { ApiResponse, asyncHandler } = require('@erp/shared');
const InvoiceService = require('../services/invoice.service');

class InvoiceController {
  static list = asyncHandler(async (req, res) => ApiResponse.paginated(res, await InvoiceService.list(req.query), 'Invoices fetched'));
  static stats = asyncHandler(async (req, res) => ApiResponse.ok(res, await InvoiceService.stats(), 'Invoice statistics fetched'));
  static get = asyncHandler(async (req, res) => ApiResponse.ok(res, await InvoiceService.getById(req.params.id), 'Invoice fetched'));
  static create = asyncHandler(async (req, res) => ApiResponse.created(res, await InvoiceService.create(req.body, req.user), 'Invoice created'));
  static fromSalesOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await InvoiceService.createFromSalesOrder(req.body.orderId, req.user), 'Sales invoice drafted'));
  static fromPurchaseOrder = asyncHandler(async (req, res) => ApiResponse.created(res, await InvoiceService.createFromPurchaseOrder(req.body.poId, req.user), 'Purchase bill drafted'));
  static issue = asyncHandler(async (req, res) => ApiResponse.ok(res, await InvoiceService.issue(req.params.id, req.user), 'Invoice issued'));
  static cancel = asyncHandler(async (req, res) => ApiResponse.ok(res, await InvoiceService.cancel(req.params.id, req.body.reason, req.user), 'Invoice cancelled'));
}
module.exports = InvoiceController;
