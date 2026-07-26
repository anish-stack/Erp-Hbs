'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const SupplierService = require('../services/supplier.service');
const WorkflowService = require('../services/workflow.service');
const RatingService = require('../services/rating.service');
const DocumentService = require('../services/document.service');

class SupplierController {
  static list = asyncHandler(async (req, res) => {
    const result = await SupplierService.list(req.query);
    return ApiResponse.paginated(res, result, 'Suppliers fetched');
  });

  static options = asyncHandler(async (req, res) => {
    const options = await SupplierService.options();
    return ApiResponse.ok(res, options, 'Approved supplier options fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await SupplierService.stats();
    return ApiResponse.ok(res, stats, 'Supplier statistics fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.getById(req.params.id);
    return ApiResponse.ok(res, supplier, 'Supplier fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.create(req.body, req.user);
    return ApiResponse.created(res, supplier, 'Supplier created in draft');
  });

  static update = asyncHandler(async (req, res) => {
    const supplier = await SupplierService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await SupplierService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Supplier deleted');
  });

  // -------------------- Workflow --------------------
  static readiness = asyncHandler(async (req, res) => {
    const result = await WorkflowService.readiness(req.params.id);
    return ApiResponse.ok(res, result, result.ready ? 'Supplier is ready for approval' : 'Supplier is not ready');
  });

  static submit = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.submit(req.params.id, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier submitted for approval');
  });

  static approve = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.approve(req.params.id, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier approved');
  });

  static reject = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.reject(req.params.id, req.body.reason, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier rejected');
  });

  static hold = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.hold(req.params.id, req.body.reason, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier put on hold');
  });

  static blacklist = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.blacklist(req.params.id, req.body.reason, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier blacklisted');
  });

  static reinstate = asyncHandler(async (req, res) => {
    const supplier = await WorkflowService.reinstate(req.params.id, req.user);
    return ApiResponse.ok(res, supplier, 'Supplier reinstated and placed on hold');
  });

  // -------------------- Child records --------------------
  static addAddress = asyncHandler(async (req, res) => {
    const address = await SupplierService.addAddress(req.params.id, req.body, req.user);
    return ApiResponse.created(res, address, 'Address added');
  });

  static updateAddress = asyncHandler(async (req, res) => {
    const address = await SupplierService.updateAddress(req.params.id, req.params.childId, req.body);
    return ApiResponse.ok(res, address, 'Address updated');
  });

  static removeAddress = asyncHandler(async (req, res) => {
    const result = await SupplierService.removeAddress(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Address removed');
  });

  static addContact = asyncHandler(async (req, res) => {
    const contact = await SupplierService.addContact(req.params.id, req.body);
    return ApiResponse.created(res, contact, 'Contact added');
  });

  static updateContact = asyncHandler(async (req, res) => {
    const contact = await SupplierService.updateContact(req.params.id, req.params.childId, req.body);
    return ApiResponse.ok(res, contact, 'Contact updated');
  });

  static removeContact = asyncHandler(async (req, res) => {
    const result = await SupplierService.removeContact(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Contact removed');
  });

  static addBankAccount = asyncHandler(async (req, res) => {
    const account = await SupplierService.addBankAccount(req.params.id, req.body);
    return ApiResponse.created(res, account, 'Bank account added');
  });

  static verifyBankAccount = asyncHandler(async (req, res) => {
    const account = await SupplierService.verifyBankAccount(req.params.id, req.params.childId, req.user);
    return ApiResponse.ok(res, account, 'Bank account verified');
  });

  static removeBankAccount = asyncHandler(async (req, res) => {
    const result = await SupplierService.removeBankAccount(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Bank account removed');
  });

  // -------------------- Documents --------------------
  static addDocument = asyncHandler(async (req, res) => {
    const document = await DocumentService.add(req.params.id, req.body, req.user);
    return ApiResponse.created(res, document, 'Document attached');
  });

  static verifyDocument = asyncHandler(async (req, res) => {
    const document = await DocumentService.verify(req.params.id, req.params.childId, req.user);
    return ApiResponse.ok(res, document, 'Document verified');
  });

  static removeDocument = asyncHandler(async (req, res) => {
    const result = await DocumentService.remove(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Document removed');
  });

  // -------------------- Ratings --------------------
  static ratingHistory = asyncHandler(async (req, res) => {
    const result = await RatingService.history(req.params.id);
    return ApiResponse.ok(res, result, 'Rating history fetched');
  });

  static evaluate = asyncHandler(async (req, res) => {
    const result = await RatingService.evaluate(req.params.id, req.body, req.user);
    return ApiResponse.created(res, result, `Supplier scored ${result.overallScore} (${result.grade})`);
  });

  static leaderboard = asyncHandler(async (req, res) => {
    const rows = await RatingService.leaderboard();
    return ApiResponse.ok(res, rows, 'Supplier leaderboard fetched');
  });
}

module.exports = SupplierController;
