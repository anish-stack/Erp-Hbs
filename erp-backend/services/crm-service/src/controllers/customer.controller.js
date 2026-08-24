'use strict';

const { ApiResponse, asyncHandler } = require('@erp/shared');
const CustomerService = require('../services/customer.service');
const ActivityService = require('../services/activity.service');

class CustomerController {
  static list = asyncHandler(async (req, res) => {
    const result = await CustomerService.list(req.query);
    return ApiResponse.paginated(res, result, 'Customers fetched');
  });

  static options = asyncHandler(async (req, res) => {
    const options = await CustomerService.options();
    return ApiResponse.ok(res, options, 'Customer options fetched');
  });

  static stats = asyncHandler(async (req, res) => {
    const stats = await CustomerService.stats();
    return ApiResponse.ok(res, stats, 'Customer statistics fetched');
  });

  static get = asyncHandler(async (req, res) => {
    const customer = await CustomerService.getById(req.params.id);
    return ApiResponse.ok(res, customer, 'Customer fetched');
  });

  static create = asyncHandler(async (req, res) => {
    const customer = await CustomerService.create(req.body, req.user);
    return ApiResponse.created(res, customer, 'Customer created');
  });

  static update = asyncHandler(async (req, res) => {
    console.log(req.body)
    const customer = await CustomerService.update(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, customer, 'Customer updated');
  });

  static remove = asyncHandler(async (req, res) => {
    const result = await CustomerService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, result, 'Customer deleted');
  });

  static setStatus = asyncHandler(async (req, res) => {
    const customer = await CustomerService.setStatus(req.params.id, req.body.status, req.body.reason, req.user);
    return ApiResponse.ok(res, customer, 'Customer status updated');
  });

  static adjustCredit = asyncHandler(async (req, res) => {
    const result = await CustomerService.adjustCredit(req.params.id, req.body, req.user);
    return ApiResponse.ok(res, result, 'Credit adjusted');
  });

  static checkCredit = asyncHandler(async (req, res) => {
    const result = await CustomerService.checkCreditAvailability(req.params.id, req.query.amount ? Number(req.query.amount) : Number(req.body.amount));
    return ApiResponse.ok(res, result, result.allowed ? 'Credit available' : 'Credit limit would be exceeded');
  });

  static addAddress = asyncHandler(async (req, res) => {
    const address = await CustomerService.addAddress(req.params.id, req.body);
    return ApiResponse.created(res, address, 'Address added');
  });
  static updateAddress = asyncHandler(async (req, res) => {
    const address = await CustomerService.updateAddress(req.params.id, req.params.childId, req.body);
    return ApiResponse.ok(res, address, 'Address updated');
  });
  static removeAddress = asyncHandler(async (req, res) => {
    const result = await CustomerService.removeAddress(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Address removed');
  });

  static addContact = asyncHandler(async (req, res) => {
    const contact = await CustomerService.addContact(req.params.id, req.body);
    return ApiResponse.created(res, contact, 'Contact added');
  });
  static updateContact = asyncHandler(async (req, res) => {
    const contact = await CustomerService.updateContact(req.params.id, req.params.childId, req.body);
    return ApiResponse.ok(res, contact, 'Contact updated');
  });
  static removeContact = asyncHandler(async (req, res) => {
    const result = await CustomerService.removeContact(req.params.id, req.params.childId);
    return ApiResponse.ok(res, result, 'Contact removed');
  });

  static activities = asyncHandler(async (req, res) => {
    const result = await ActivityService.listForCustomer(req.params.id, req.query);
    return ApiResponse.paginated(res, result, 'Activities fetched');
  });
}

module.exports = CustomerController;
